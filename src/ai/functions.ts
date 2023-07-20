import { filesystem, print } from 'gluegun'
import { ChatCompletionFunctions } from 'openai'

type ChatCompletionFunction = ChatCompletionFunctions & {
  fn: (args: any) => Promise<{
    content?: string
    resubmit?: boolean
    error?: string
  }>
}

export const aiFunctions: ChatCompletionFunction[] = [
  {
    name: 'patch',
    description: `Allows replacing or deleting the first matching string in a given file.`,
    parameters: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'The file to patch',
        },
        instructions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              replace: {
                type: 'string',
                description:
                  'Replace this string with the insert string (be specific and include whitespace or more lines if necessary to disambiguate which one needs to be replaced)',
              },
              insert: {
                type: 'string',
                description: 'Insert this string to replace the replace string',
              },
            },
          },
        },
      },
      required: ['file', 'instructions'],
    },
    fn: async (args) => {
      const { file, instructions } = args

      // ensure that the path is not any higher than the working folder
      if (filesystem.path(file).startsWith(args.workingFolder) === false) {
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
        const { insert, replace } = instruction

        // Replace the string
        if (fileContents.includes(replace)) {
          fileContents = fileContents.replace(replace, insert)
          // increment the number of patches
          response.patches++
        }
      }

      // Write the file
      await filesystem.writeAsync(file, fileContents)

      print.info(`Updated ${file} with ${response.patches}.`)

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
    fn: async (args) => {
      // ensure that the path is not any higher than the working folder
      if (filesystem.path(args.path).startsWith(args.workingFolder) === false) {
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
    fn: async (args) => {
      // Read the file
      const contents = await filesystem.readAsync(args.path, 'utf8')

      if (contents === undefined) {
        return { error: `File '${args.path}' does not exist.` }
      }

      print.info(`Read ${args.path} (${contents.length} characters).`)

      // Return the contents
      return {
        content: JSON.stringify({ path: args.path, contents }),
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
    fn: async (args) => {
      // List the files
      const files = await filesystem.listAsync(args.path)

      print.info(`Found ${files.length} at path: ${args.path}\n`)

      // Return the contents
      return {
        content: JSON.stringify({ path: args.path, files }),
        resubmit: true,
      }
    },
  },
]
