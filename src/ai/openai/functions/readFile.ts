import type { ChatCompletionFunction } from '../../../types'

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
}
