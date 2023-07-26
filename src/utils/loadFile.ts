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

  // TODO: get embeddings for this file
  const embeddings = undefined

  // add the file to the context or update it if it already exists
  const file = { ...existingFile, path: fileName, contents, embeddings }
  context.files[fileName] = file

  // add it as the current file
  context.currentFile = fileName

  // kick off fetching the embeddings for this file, if it's changed
  if (existingFile && existingFile.contents !== contents) {
    // we won't await, since we want to do this in the background

    // get the embeddings for this file
    createEmbedding(file.contents).then((embedding) => {
      file.embeddings = embedding
    })

    // let's also grab a shortened version of the file for secondary files
    chatGPTPrompt({
      messages: [
        {
          role: 'user',
          content: `Take this code and summarize it by removing all function bodies and replacing them with a very short comment that says what the function does, and reply back with it.\n\n${file.contents}`,
        },
      ],
      model: 'gpt-3.5-turbo',
    }).then((response) => {
      file.shortened = response.content
    })
  }

  // return the file
  return file
}
