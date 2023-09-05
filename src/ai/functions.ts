import { filesystem, print } from 'gluegun'
import { ChatCompletionFunctions } from 'openai'
import { listFiles } from '../utils/experimental/listFiles'
import { SmartContext } from '../types'

type ChatCompletionFunctionResponse = {
  file?: string
  content?: string
  resubmit?: boolean
  patches?: {
    findLine: string
    replaceLine: string
  }[]
  error?: string
}

type ChatCompletionFunction = ChatCompletionFunctions & {
  fn: (args: any, context: SmartContext) => Promise<ChatCompletionFunctionResponse>
}

type ContextUpdaterArgs = {
  newProjectDescription?: string
  newTaskDescription?: string
}

type PatchLinesArgs = {
  file: string
  instructions: { findLine: string; replaceLine: string }[]
} & ContextUpdaterArgs

const contextUpdaterFunctions = {
  newProjectDescription: {
    type: 'string',
    description:
      'Optional: new general project description to use for the current project, based on everything we know so far, if the existing project description is not accurate.',
  },
  newTaskDescription: {
    type: 'string',
    description:
      'Optional: new task description to use for the current task, based on everything we know so far, if the existing task description is not accurate.',
  },
}

const updateProjectAndTask = (args: ContextUpdaterArgs, context: SmartContext) => {
  let result = ``

  if (args.newProjectDescription) {
    context.project = args.newProjectDescription
    result += `Updated project description to: ${context.project}\n\n`
  }
  if (args.newTaskDescription) {
    context.currentTask = args.newTaskDescription
    result += `Updated task description to: ${context.currentTask}\n\n`
  }

  return result
}

export const aiFunctions: ChatCompletionFunction[] = [
  {
    name: 'patchLines',
    description: `Allows replacing or deleting a matching line in a given file (but can do multiple lines via multiple instructions). Generally speaking, avoid updating more than one code statement at a time. Ensure that your indentation is perfect or it won't work properly.`,
    parameters: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'The file to patch lines of code in',
        },
        instructions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              findLine: {
                type: 'string',
                description:
                  'Look for this unique string in a line and replace that entire line with the insert string',
              },
              replaceLine: {
                type: 'string',
                description: 'Insert this line to replace the replace line',
              },
            },
          },
          ...contextUpdaterFunctions,
        },
      },
      required: ['file', 'instructions'],
    },
    fn: async (args: PatchLinesArgs, context) => {
      const { file, instructions } = args

      let content = updateProjectAndTask(args, context)

      // ensure that the path is not any higher than the working folder
      if (filesystem.path(file).startsWith(context.workingFolder) === false) {
        return { error: 'Cannot update a file outside of the working folder.' }
      }

      // construct a response
      let response: ChatCompletionFunctionResponse = {
        content,
        file,
        patches: [],
      }

      let fileContents = await filesystem.readAsync(file, 'utf8')

      // if the file doesn't exist, return an error
      if (fileContents === undefined) {
        return { error: `File '${file}' does not exist.` }
      }

      instructions.forEach((instruction) => {
        const { findLine, replaceLine } = instruction

        // Replace the string
        if (fileContents && fileContents.includes(findLine)) {
          fileContents = fileContents.replace(findLine, replaceLine)
          // increment the number of patches
          if (response.patches) response.patches.push({ findLine, replaceLine })
        }
      })

      // Write the file
      await filesystem.writeAsync(file, fileContents)

      // print.info(`Updated ${file} with ${response.patches.length} patches.`)

      // return the response
      return response
    },
  },
  {
    name: 'createFile',
    description: 'Create a file',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path of the file to create.',
        },
        contents: {
          type: 'string',
          description: 'The text contents of the file to create.',
        },
        ...contextUpdaterFunctions,
      },
      required: ['path', 'contents'],
    },
    fn: async (args: { path: string; contents: string } & ContextUpdaterArgs, context) => {
      let content = updateProjectAndTask(args, context)

      // ensure that the path is not any higher than the working folder
      if (filesystem.path(args.path).startsWith(context.workingFolder) === false) {
        return { error: 'Cannot create a file outside of the working folder.' }
      }

      // Create the file
      console.log('POTENTIAL ERROR HERE START')
      console.log(typeof args.contents)
      console.log('POTENTIAL ERROR HERE END')
      await filesystem.writeAsync(args.path, args.contents)

      content += `Created ${args.path}.`

      return { content }
    },
  },
  {
    name: 'readFileAndReportBack',
    description: 'Read a file and report back with the contents',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path of the file to read.',
        },
        ...contextUpdaterFunctions,
      },
      required: ['path'],
    },
    fn: async (args: { path: string } & ContextUpdaterArgs, context) => {
      let content = updateProjectAndTask(args, context)

      // Make sure it exists
      const fileExists = await filesystem.existsAsync(args.path)

      if (!fileExists) {
        return { error: `File '${args.path}' does not exist.` }
      }

      // We resubmit; the file will be read in the next iteration
      return {
        content,
        resubmit: true,
      }
    },
  },
  {
    name: 'listFilesAndReportBack',
    description: 'List files and subfolders in a folder and reports back with a list',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path of the folder to list the contents of.',
        },
        ...contextUpdaterFunctions,
      },
      required: ['path'],
    },
    fn: async (args: { path: string } & ContextUpdaterArgs, context) => {
      let content = updateProjectAndTask(args, context)

      // List the files

      const files = await listFiles(args.path, context)

      if (!files) {
        return { error: `No files found at path: ${args.path}` }
      }

      content += `Found ${files.length} at path: ${args.path}\n`

      for (let file of files) {
        const filepath = `${args.path}/${file}`
        context.files[filepath] = {
          path: filepath,
        }
      }

      // Return the contents
      return {
        content,
        resubmit: true,
      }
    },
  },
  {
    name: 'updateProjectSummaryAndTask',
    description:
      'Update the project summary and current task for the current project based on everything I know so far',
    parameters: {
      type: 'object',
      properties: {
        ...contextUpdaterFunctions,
      },
    },
    fn: async (args: { newSummary: string; newTaskDescription: string } & ContextUpdaterArgs, context) => {
      let content = updateProjectAndTask(args, context)

      // We're done, wait for further instructions
      return { content }
    },
  },
]

export type AIFunctions = typeof aiFunctions
