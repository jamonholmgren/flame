import { filesystem } from 'gluegun'
import type { SmartContext } from '../types'
import { chatGPTPrompt, createEmbedding } from '../ai/openai'

export async function loadFile(fileName: string, context: SmartContext) {
  const path = filesystem.path(`${context.workingFolder}/${fileName}`)

  // get the existing file from the context if it exists
  const existingFile = context.files[fileName]

  // read the file
  const contents = await filesystem.readAsync(path, 'utf8')

  // if there is no file, return undefined
  if (!contents) return undefined

  // add the file to the context or update it if it already exists
  const file = { ...existingFile, path: fileName, contents }
  context.files[fileName] = file

  // add it as the current file
  context.currentFile = fileName

  // kick off fetching the embeddings for this file, if it's changed
  if (!existingFile || existingFile.contents !== contents) {
    // get the embeddings for this file (including the filename)
    const embedding = await createEmbedding(`// ${file.path}\n${file.contents}`)
    file.embeddings = embedding[0].embedding

    // let's also grab a shortened version of the file for secondary files
    const response = await chatGPTPrompt({
      messages: [
        {
          role: 'user',
          content: `
Take this code and summarize it / shorten it quite a bit by removing all function bodies
and replacing them with one very short comment that says what the function does,
and reply back with it to me.

Examples:

export function foo() {
  // omitted: prints 'hello foo'
}

export const bar = () => {
  // omitted: prints 'hello bar'
}

export class Baz {
  constructor() {
    // omitted: sets variables
  }

  bye() {
    // omitted: returns 'bye baz'
  }
}

Actual file contents:

\`\`\`
${file.contents}
\`\`\`
`,
        },
      ],
      model: 'gpt-3.5-turbo',
    })
    file.shortened = response.content
  }

  // return the file
  return file
}
