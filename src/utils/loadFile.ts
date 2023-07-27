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
          role: 'system',
          content: `
You are a high-powered code compression algorithm.
For code, you remove function bodies and comments.
You leave only the function signatures or classes and their method signatures.
You strip out any function bodies and comments, and leave only a short comment like:

function foo() {
  // omitted
}

For text files, you summarize every paragraph in a tiny sentence.
`,
        },
        {
          role: 'user',
          content: `
Please compress this file:

\`\`\`
${
  file.contents.length < 3000
    ? file.contents
    : file.contents.slice(0, 3000) + '...truncated for brevity'
}
\`\`\`
`,
        },
      ],
      model: 'gpt-3.5-turbo',
    })
    file.shortened = `Compressed/shortened for brevity:\n\n${response.content}`
  }

  // return the file
  return file
}
