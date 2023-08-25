import { filesystem, print } from 'gluegun'
import { ChatCompletionFunction } from '../../types'

export const deleteFile: ChatCompletionFunction = {
  name: 'deleteFile',
  description: 'Delete a file',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path of the file to delete.',
      },
    },
  },
  fn: async (args) => {
    // Delete the file
    await filesystem.removeAsync(args.path)

    return {
      content: `Deleted file ${args.path}`,
      changes: print.colors.red('Deleted file ' + args.path),
    }
  },
}
