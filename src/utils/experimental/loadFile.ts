import { filesystem } from 'gluegun'
import type { ProjectFile, SmartContext } from '../../types'
import { createEmbedding } from '../../ai/openai/openai'

export async function loadFile(
  fileName: string,
  context: SmartContext
): Promise<{ file: ProjectFile | undefined; contents: string } | undefined> {
  const path = filesystem.path(`${context.workingFolder}/${fileName}`)

  // get the existing file from the context if it exists
  const existingFile = context.files[fileName]

  // read the file
  const contents = await filesystem.readAsync(path, 'utf8')

  // if there is no file, return undefined
  if (!contents) return undefined

  // add the file to the context or update it if it already exists
  const file: ProjectFile = { ...existingFile, path: fileName, length: contents.length }
  context.files[fileName] = file

  // add it as the current file (last file read)
  context.currentFile = fileName

  // kick off fetching the embeddings for this file, if it's changed
  // we use length as a proxy for whether the file has changed
  // it's not perfect, but we rarely need to change the embeddings to be honest
  if (!existingFile || existingFile.length !== contents.length) {
    // get the embeddings for this file (including the filename)
    const embedding = await createEmbedding(`// ${file.path}\n${contents}`)
    file.embeddings = embedding[0].embedding
  }

  // return the file
  return { file, contents }
}
