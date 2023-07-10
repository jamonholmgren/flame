export const recipe = {
  prompt: `
    Replace the jQuery functions in the following code with plain JavaScript equivalents.
    Use the simplest version of the equivalent plain JavaScript function that you can.
    Do not add additional comments to the replacements.
    Use JSDoc to document the types on each function.
    If there are multiple ways to do the replacement, choose the one that is most similar to the original jQuery function.
    For jQuery plugins, the API will change from:

\`\`\`
$('#my-element').myPlugin({ foo: 'bar' })
\`\`\`

    to:

\`\`\`
myPlugin('#my-element', { foo: 'bar' })
\`\`\`

If there is no jQuery-related code or functions, just return the original source code as-is.
`,
  admonishments: `
    Return only the full, modified file contents and no other explanation or notes!
    Match same spacing and indentation.
    If you delineate the response with three backticks, we will strip them out.
    We are using a node-based tool to automatically parse and update the code, so it must not include other explanation other than the code.
    If you include explanations, or don't include the full source code, our tool will break! DO NOT DO THIS!
  `,
  shouldConvert: (sourceFileContents: string) => {
    // return sourceFileContents.includes('jQuery')

    // we don't really have an easy way to check if the file is jQuery or not, so
    // we will convert every file
    return true
  },
  chunk: (source: string) => {
    // Specific line numbers for Slick Carousel in this case
    const lineNumbers = [1049, 2023, 3038]

    // First, split the sourceFileContents into an array of lines.
    const lines = source.split('\n')

    let chunks = []

    // We start with startLine = 0 and endLine = the first value from lineNumbers
    let startLine = 0
    let endLine = lineNumbers[0]

    // Use a for loop to create chunks of lines based on lineNumbers
    for (let i = 0; i <= lineNumbers.length; i++) {
      // slice the lines from startLine to endLine (endLine not included)
      let chunkLines = lines.slice(startLine, endLine)
      // join the chunkLines into a single string
      let chunk = chunkLines.join('\n')

      // push the chunk into chunks array
      chunks.push(chunk)

      // update startLine and endLine for the next iteration
      startLine = endLine
      endLine = lineNumbers[i + 1]
    }

    return chunks
  },
}
