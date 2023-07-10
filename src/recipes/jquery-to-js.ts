export const recipe = {
  prompt: `
    Examine the following code. If you find any jQuery functions, replace them with plain JavaScript equivalents. 
    Use the simplest version of the equivalent plain JavaScript function you can.
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

    Additional changes will likely be necessary to remove the reliance on jQuery, both for the plugin itself and for the code that uses the plugin.
    Use your knowledge of how jQuery maps to plain JavaScript to make these changes.
    You can use the knowledge of youmightnotneedjquery.com to help you.

    If there are no jQuery-related functions or plugins, then return the original code as-is without any modifications or comments, even if there might be other areas in the code that could be subject to changes or improvements. No explanations are necessary. Do not provide any additional commentary on the code, just perform the jQuery conversion or return the code as is.
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
