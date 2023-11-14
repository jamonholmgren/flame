import type { FnCall } from '../../../types'
import { filesystem, print } from 'gluegun'

type DeleteFileArgs = {
  path: string
}

export const deleteFile: FnCall = {
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
  fn: async (args: DeleteFileArgs) => {
    // Delete the file
    await filesystem.removeAsync(args.path)

    return {
      name: 'deleteFile',
      content: `Deleted file ${args.path}`,
      changes: print.colors.red('Deleted file ' + args.path),
    }
  },
}
