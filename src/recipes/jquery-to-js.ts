export const recipe = {
  prompt: `
    Replace the jQuery functions in the following code with plain JavaScript equivalents.
    Use the simplest version of the equivalent plain JavaScript function that you can.
    Do not add comments to the replacements.
  `,
  finalNotes: `
    Return only the full file contents and no other explanation or notes.
    Do not use three backticks to delimit the start/end of the code. Only return the code.
    If there is no jQuery code, just return the original source code as-is.
  `,
  shouldConvert: (sourceFileContents: string) => {
    return true // sourceFileContents.includes('ramda')
  },
}
