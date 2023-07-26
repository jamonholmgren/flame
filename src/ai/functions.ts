import { filesystem, print } from 'gluegun'
import { ChatCompletionFunctions } from 'openai'
import { listFiles } from '../utils/listFiles'
import { SmartContext } from '../types'
import { loadFile } from '../utils/loadFile'

type ChatCompletionFunction = ChatCompletionFunctions & {
  fn: (
    args: unknown,
    context: SmartContext
  ) => Promise<{
    content?: string
    resubmit?: boolean
    error?: string
  }>
}

export const aiFunctions: ChatCompletionFunction[] = [
  {
    name: 'patchLines',
    description: `Allows replacing or deleting a matching line in a given file (but can do multiple lines via multiple instructions). Only replaces one line or part of one line per instruction.`,
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
                  'Look for this string in a line and replace that line with the insert string',
              },
              replaceLine: {
                type: 'string',
                description: 'Insert this line to replace the replace line',
              },
            },
          },
        },
      },
      required: ['file', 'instructions'],
    },
    fn: async (
      args: { file: string; instructions: { findLine: string; replaceLine: string }[] },
      context
    ) => {
      const { file, instructions } = args

      // ensure that the path is not any higher than the working folder
      if (filesystem.path(file).startsWith(context.workingFolder) === false) {
        return { error: 'Cannot update a file outside of the working folder.' }
      }

      // construct a response
      let response = {
        file,
        patches: 0,
      }

      let fileContents = await filesystem.readAsync(file, 'utf8')

      // if the file doesn't exist, return an error
      if (fileContents === undefined) {
        return { error: `File '${file}' does not exist.` }
      }

      for (let instruction of instructions) {
        const { findLine, replaceLine } = instruction

        // Replace the string
        if (fileContents.includes(findLine)) {
          fileContents = fileContents.replace(findLine, replaceLine)
          // increment the number of patches
          response.patches++
        }
      }

      // Write the file
      await filesystem.writeAsync(file, fileContents)

      print.info(`Updated ${file} with ${response.patches} patches.`)

      // return the response
      return {
        content: JSON.stringify(response),
      }
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
          description: 'The contents of the file to create.',
        },
      },
      required: ['path', 'contents'],
    },
    fn: async (args: { path: string; contents: string }, context) => {
      // ensure that the path is not any higher than the working folder
      if (filesystem.path(args.path).startsWith(context.workingFolder) === false) {
        return { error: 'Cannot create a file outside of the working folder.' }
      }

      // Create the file
      await filesystem.writeAsync(args.path, args.contents)

      print.info(`Created ${args.path}.`)

      return { content: JSON.stringify({ path: args.path }) }
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
      },
      required: ['path'],
    },
    fn: async (args: { path: string }, context) => {
      // Read the file
      const file = await loadFile(args.path, context)

      if (file.contents === undefined) {
        return { error: `File '${args.path}' does not exist.` }
      }

      print.info(`Read ${args.path} (${file.contents.length} characters).`)

      // Return the contents
      return {
        content: JSON.stringify({ path: args.path, contents: file.contents }),
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
      },
      required: ['path'],
    },
    fn: async (args: { path: string }, context) => {
      // List the files

      const files = await listFiles(args.path, context)

      print.info(`Found ${files.length} at path: ${args.path}\n`)

      // Return the contents
      return {
        content: JSON.stringify({ path: args.path, files }),
        resubmit: true,
      }
    },
  },
  {
    name: 'updateProjectSummary',
    description: 'Update the project summary for the current project based on everything I know',
    parameters: {
      type: 'object',
      properties: {
        newSummary: {
          type: 'string',
          description: 'The new summary to use for the project.',
        },
      },
      required: ['newSummary'],
    },
    fn: async (args: { newSummary: string }, context) => {
      // Update the project summary
      context.project = args.newSummary

      // We're done, wait for further instructions
      return { content: undefined }
    },
  },
]

export type AIFunctions = typeof aiFunctions
