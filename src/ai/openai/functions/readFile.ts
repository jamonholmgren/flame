import type { FnCall, ToolCallResult } from '../../../types'
import { filesystem } from 'gluegun'

export const readFile: FnCall = {
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
  fn: async (args: { path: string }) => {
    // Make sure it exists
    const fileExists = await filesystem.existsAsync(args.path)

    if (!fileExists) {
      return {
        name: 'readFileAndReportBack',
        error: `File '${args.path}' does not exist.`,
      }
    }

    // Read the file
    const content = await filesystem.readAsync(args.path)

    // We resubmit with the file contents
    const returnValue: ToolCallResult = {
      name: 'readFileAndReportBack',
      content,
      next: 'resubmit',
    }

    return returnValue
  },
}
