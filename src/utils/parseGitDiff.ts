export type FileData = {
  path: string
  diff: string
  change: 'pending' | 'created' | 'modified' | 'deleted' | 'skipped' | 'ignored'
  error?: string
  customPrompts: string[]
}

type ParseDiffResult = FileData[]

/**
 * Parses a git diff into an array with the files that changed
 * and the diff for each file, along with some other metadata.
 *
 * Example return object:
 *
 * [
 *  {
 *    path: 'ios/AppDelegate.mm',
 *    diff: '...',
 *    change: 'pending',
 *    error: undefined,
 *    customPrompts: [],
 *  },
 *  {
 *    path: 'android/app/src/main/java/com/rndiffapp/MainActivity.java',
 *    diff: '...',
 *    change: 'pending',
 *    error: undefined,
 *    customPrompts: [],
 *  },
 *  ...
 * ]
 */
export function parseGitDiff(diffString: string): ParseDiffResult {
  const files: ParseDiffResult = []
  let currentFile: FileData = undefined

  const lines = diffString.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('diff --git')) {
      const match = line.match(/diff --git a\/(.+) b\/(.+)/)
      if (match) {
        const fileName = match[2]
        currentFile = {
          path: fileName,
          diff: '',
          change: 'pending',
          error: undefined,
          customPrompts: [],
        }
        files.push(currentFile)
      }
    } else if (line.startsWith('@@')) {
      // Skip the @@ line, as it contains the line numbers
      i++
    } else if (line.startsWith('index')) {
      // skip the index
      i++
    } else if (line.startsWith('---')) {
      // skip the --- line
      i++
    } else if (line.startsWith('+++')) {
      // skip the +++ line
      i++
    } else if (currentFile !== null) {
      currentFile.diff += line + '\n'
    }
  }

  return files
}
