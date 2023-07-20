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
      let response = `Updated ${file}:

`

      for (let instruction of instructions) {
        const { insert, replace } = instruction

        const fileContents = await filesystem.readAsync(file, 'utf8')

        // if the file doesn't exist, return an error
        if (fileContents === undefined) {
          return { error: `File '${file}' does not exist.` }
        }

        // Replace the string
        const patchedFileContents = fileContents.replace(replace, insert)

        // Write the file
        await filesystem.writeAsync(file, patchedFileContents)

        // Add to the response
        response += `Replaced

"${replace}"
with
"${insert}"

`
      }

      print.info(`Updated ${file}.
`)

      // return the response
      return {
        content: response,
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
    },
    fn: async (args) => {
      // ensure that the path is not any higher than the working folder
      if (filesystem.path(args.path).startsWith(args.workingFolder) === false) {
        return { error: 'Cannot create a file outside of the working folder.' }
      }

      // Create the file
      await filesystem.writeAsync(args.path, args.contents)

      print.info(`Created ${args.path}.`)

      return { content: `Created file ${args.path}` }
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
        content: `Here is the file you requested (${args.path}):` + contents,
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
    },
    fn: async (args) => {
      // List the files
      const files = await filesystem.listAsync(args.path)

      print.info(`Found ${files.length} at ${args.path}\n`)

      // Return the contents
      return {
        content: `Here are the files you requested (${args.path}):\n\n` + files.join('\n'),
        resubmit: true,
      }
    },
  },
]
