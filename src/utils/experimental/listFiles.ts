import { filesystem } from 'gluegun'
import type { ListFilesOptions } from '../../types'

/**
 * Lists all files in a given path.
 * @param path The path to list the files of.
 * @param context The context to add the files to.
 * @param options Options, mainly whether to list files recursively.
 * @returns The list of files.
 **/
export async function listFiles(path: string, { recursive, ignore, maxDepth, currentDepth }: ListFilesOptions = {}) {
  // default ignore
  ignore = ['node_modules', '.git', '.config', ...(ignore || [])]

  recursive = recursive || true
  currentDepth = currentDepth || 0
  maxDepth = maxDepth || 10

  // list files
  const allFiles = (await filesystem.listAsync(path)) || []

  const foundFiles: string[] = []

  // recursively add files
  for (let file of allFiles) {
    // avoid known top-level directories like node_modules
    if (file === '.' || file === '..') continue
    if ([...ignore].includes(file)) continue

    let filePath = path === '.' ? file : path + file

    // if it is a directory, add a trailing slash
    if (filesystem.isDirectory(filePath) && !filePath.endsWith('/')) {
      filePath += '/'
    }

    foundFiles.push(filePath)

    // if we're going recursively, go list the files in the subdirectory
    if (recursive && filesystem.isDirectory(filePath) && currentDepth < maxDepth) {
      const subFiles = await listFiles(filePath, { recursive, ignore, maxDepth, currentDepth: currentDepth + 1 })
      if (subFiles) foundFiles.push(...subFiles)
    }
  }

  return foundFiles
}
