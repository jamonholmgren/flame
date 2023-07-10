/**
 * Function to split source file content into chunks at specific line numbers.
 *
 * @param {string} sourceFileContents The content of the source file.
 * @param {number[]} lineNumbers An array of line numbers at which to split the content.
 * @returns {string[]} An array of content chunks.
 */
export function chunkByLines(sourceFileContents: string, lineNumbers: number[]): string[] {
  let chunks: string[] = []
  let lines = sourceFileContents.split('\n')

  // Ensure the lineNumbers array is in ascending order
  lineNumbers.sort((a, b) => a - b)

  // Append an extra line number representing the end of the file
  lineNumbers.push(lines.length)

  let chunkStart = 0
  for (let lineNumber of lineNumbers) {
    // Grab the chunk of lines from chunkStart to lineNumber
    let chunk = lines.slice(chunkStart, lineNumber).join('\n')
    chunks.push(chunk)

    // Update chunkStart to begin at the next line
    chunkStart = lineNumber
  }

  return chunks
}
