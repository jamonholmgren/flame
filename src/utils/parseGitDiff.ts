type FileDiff = {
  path: string
  diff: string
  change: 'pending' | 'created' | 'modified' | 'deleted' | 'skipped' | 'ignored'
  error?: string
  customPrompts: string[]
}

type ParseDiffResult = { [path: string]: FileDiff }

/**
 * Parses a git diff into an object with the files that changed
 * and the diff for each file, along with some other metadata.
 *
 * Example return object:
 *
 * {
 *  'ios/AppDelegate.mm': {
 *    path: 'ios/AppDelegate.mm',
 *    diff: '...',
 *    change: 'pending',
 *    error: undefined,
 *    customPrompts: [],
 *  },
 *  'android/app/src/main/java/com/rndiffapp/MainActivity.java': {
 *    path: 'android/app/src/main/java/com/rndiffapp/MainActivity.java',
 *    diff: '...',
 *    change: 'pending',
 *    error: undefined,
 *    customPrompts: [],
 *  },
 *  ...
 * }
 */
export function parseGitDiff(diffString: string): ParseDiffResult {
  const files: ParseDiffResult = {}
  let currentFile = null

  const lines = diffString.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('diff --git')) {
      const match = line.match(/diff --git a\/(.+) b\/(.+)/)
      if (match) {
        const fileName = match[2]
        currentFile = fileName
        files[currentFile] = {
          path: fileName,
          diff: '',
          change: 'pending',
          error: undefined,
          customPrompts: [],
        }
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
      files[currentFile].diff += line + '\n'
    }
  }

  return files
}
