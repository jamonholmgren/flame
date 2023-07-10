export const recipe = {
  prompt: `
    Replace the ava test functions in the following code with jest equivalents.
    Use the simplest version of the equivalent jest function that you can.
    Do not add comments to the replacements.
    Include any imports that are needed and remove any that are not needed.
    Do not modify code that is not related to the test functions.
  `,
  admonishments: `
    Return only the full file contents and no other explanation or notes.
    Do not use three backticks to delimit the start/end of the code. Only return the code.
    If there is no Ava test code, just return the original source code as-is.
    Do not output "Here is the modified file" or anything like it.
    We only want the modified code! This is important!
    If you output additional text, our tool will not be able to extract the
    modified code and replace the original code with it.
  `,
  shouldConvert: (sourceFileContents: string) => {
    return sourceFileContents.includes('ava')
  },
}
