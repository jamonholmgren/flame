import { filesystem, print } from 'gluegun'
import { ChatCompletionFunction } from '../../../types'

export const createFile: ChatCompletionFunction = {
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
    // Create the file
    await filesystem.writeAsync(args.path, args.contents)

    return {
      content: `Created file ${args.path}`,
      changes: print.colors.green(args.contents),
    }
  },
}
