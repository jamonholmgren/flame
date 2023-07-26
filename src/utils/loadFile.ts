import { filesystem } from 'gluegun'
import type { SmartContext } from '../types'

export async function loadFile(fileName: string, context: SmartContext) {
  const path = filesystem.path(`${context.workingFolder}/${fileName}`)

  // read the file
  const contents = await filesystem.readAsync(path, 'utf8')

  // if there is no file, return undefined
  if (!contents) return undefined

  // TODO: get embeddings for this file
  const embeddings = undefined

  // add the file to the context or update it if it already exists
  const file = { path: fileName, contents, embeddings }
  context.files[fileName] = file

  // return the file
  return file
}
