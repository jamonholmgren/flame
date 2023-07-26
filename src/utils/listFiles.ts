import { filesystem } from 'gluegun'
import type { SmartContext } from '../types'

export async function listFiles(path: string, context: SmartContext) {
  // list files
  const files = await filesystem.listAsync(path)

  // if there are no files, return undefined
  if (!files) return undefined

  // add the files to the context if they don't already exist
  files.forEach((file) => {
    if (!context.files[file]) {
      context.files[file] = { path: file }
    }
  })

  return files
}
