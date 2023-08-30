import { print } from 'gluegun'

/**
 * Check if the file should be ignored
 */
export function isFileIgnored({ ignoreFiles, only, fileData }): boolean {
  if (fileData.diff.includes('GIT binary patch')) {
    // stop('🙈', `Skipping binary patch for ${file}`)
    print.info(`↠ Skipping: ${fileData.path} (binary file)\n`)
    fileData.change = 'skipped'
    return true
  }

  if (ignoreFiles.find((v) => fileData.path.includes(v))) {
    print.info(`↠ Ignoring: ${fileData.path}\n`)
    fileData.change = 'ignored'
    return true
  }

  // if they pass --only, only convert the file they specify
  if (only && !fileData.path.includes(only)) {
    print.info(`↠ Skipping: ${fileData.path}\n`)
    fileData.change = 'skipped'
    return true
  }

  return false
}
