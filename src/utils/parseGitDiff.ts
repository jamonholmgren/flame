// parse out all the files that were changed in the diff, returning an array of file paths and names
export function parseGitDiff(diffString) {
  const files = {}
  let currentFile = null

  const lines = diffString.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('diff --git')) {
      const match = line.match(/diff --git a\/(.+) b\/(.+)/)
      if (match) {
        const fileName = match[2]
        currentFile = fileName
        files[currentFile] = ''
      }
    } else if (line.startsWith('@@')) {
      // Skip the @@ line, as it contains the line numbers
      i++
    } else if (currentFile !== null) {
      files[currentFile] += line + '\n'
    }
  }

  return files
}
