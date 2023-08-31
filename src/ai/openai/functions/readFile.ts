import type { ChatCompletionFunction, ChatCompletionFunctionResult } from '../../../types'
import { filesystem } from 'gluegun'

export const readFile: ChatCompletionFunction = {
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
      return { error: `File '${args.path}' does not exist.` }
    }

    // We resubmit; the file will be read in the next iteration
    const returnValue: ChatCompletionFunctionResult = {
      next: 'resubmit',
    }

    return returnValue
  },
}
