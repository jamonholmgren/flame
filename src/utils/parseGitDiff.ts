import type { FileData } from '../types'

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
export function parseGitDiff(diffString: string): FileData[] {
  const files: FileData[] = []
  const fileDiffs = diffString.split('diff --git ')

  for (let i = 1; i < fileDiffs.length; i++) {
    // Starting at 1 to skip the initial empty string
    const fileDiff = fileDiffs[i]
    if (fileDiffs[i].includes('GIT binary patch\n')) continue

    const lines = fileDiff.split('\n')

    // The first line should contain the file names
    const match = lines[0].match(/a\/(.+) b\/(.+)/)
    if (!match) throw new Error(`Could not parse git diff line: ${lines[0]}`)

    const fileName = match[2]
    const currentFile: FileData = {
      path: fileName,
      diff: '',
      change: 'pending',
      error: undefined,
      customPrompts: [],
    }

    // Construct the diff string for this file (excluding meta lines)
    const diffLines = lines.slice(1) // Skip the first line, which contains the file names
    for (const line of diffLines) {
      if (!line.startsWith('@@') && !line.startsWith('index ') && !line.startsWith('---') && !line.startsWith('+++')) {
        currentFile.diff += line + '\n'
      }
    }

    files.push(currentFile)
  }

  return files
}
