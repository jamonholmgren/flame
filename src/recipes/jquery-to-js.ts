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

If there is no jQuery-related code or functions, return the original source code as-is.
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
  // no `chunk` function, because we want to use the built-in one
}
