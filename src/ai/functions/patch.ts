import { filesystem } from 'gluegun'
import { ChatCompletionFunction } from '../../types'

export const patch: ChatCompletionFunction = {
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
              description: 'Replace this string with the insert string',
            },
            insert: {
              type: 'string',
              description: 'Insert this string',
            },
          },
        },
      },
    },
    required: ['file', 'instructions'],
  },
  fn: async (args) => {
    const { file, instructions } = args

    let undos = []

    for (let instruction of instructions) {
      const { insert, replace } = instruction

      const fileContents = await filesystem.readAsync(file, 'utf8')

      // Replace the string
      const patchedFileContents = fileContents.replace(replace, insert)

      // Write the file
      await filesystem.writeAsync(file, patchedFileContents)

      // Have an "undo" option which undoes all the patches one at a time
      undos.unshift(async () => filesystem.writeAsync(file, fileContents))
    }

    return {
      content: `Patched ${file}`,
      undo: async () => {
        for (let undo of undos) {
          await undo()
        }
      },
    }
  },
}
