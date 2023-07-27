import { filesystem } from 'gluegun'
import type { SmartContext, ListFilesOptions } from '../types'

/**
 * Lists all files in a given path, and adds them to the context.
 * @param path The path to list the files of.
 * @param context The context to add the files to.
 * @param options Options, mainly whether to list files recursively.
 * @returns The list of files.
 **/
export async function listFiles(
  path: string,
  context: SmartContext,
  { recursive, ignore }: ListFilesOptions = { recursive: false, ignore: undefined }
) {
  // default ignore
  ignore = ignore || ['node_modules, .git']

  // list files
  const files = await filesystem.listAsync(context.workingFolder + '/' + path)

  // if there are no files, return undefined
  if (!files || files.length === 0) return undefined

  let allFiles = []

  // add the files to the context if they don't already exist
  for (let file of files) {
    // avoid known top-level directories like node_modules
    if (file === '.' || file === '..') continue
    if ([...ignore].includes(file)) continue

    let filePath = path === '.' ? file : path + file

    // if it is a directory, add a trailing slash
    if (filesystem.isDirectory(filePath) && !filePath.endsWith('/')) {
      filePath += '/'
    }

    if (!context.files[filePath]) {
      context.files[filePath] = { path: filePath }
    }

    allFiles.push(filePath)

    // if we're going recursively, go list the files in the subdirectory
    if (recursive && filesystem.isDirectory(filePath)) {
      const subFiles = await listFiles(filePath, context, { recursive })
      if (subFiles) allFiles.push(...subFiles)
    }
  }

  return allFiles
}
