import type { FnCall } from '../../../types'
import { filesystem, print } from 'gluegun'

type CreateFileArgs = {
  path: string
  contents: string
}

export const createFile: FnCall = {
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
  fn: async (args: CreateFileArgs) => {
    // Create the file
    await filesystem.writeAsync(args.path, args.contents)

    return {
      name: 'createFile',
      content: `Created file ${args.path}`,
      changes: print.colors.green(args.contents),
    }
  },
}
