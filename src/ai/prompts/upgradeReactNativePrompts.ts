type UpgradeReactNativePrompts = {
  from: string
  to: string
  file: string
  contents: string
  diff: string
}

function code(s: string) {
  return `\n\`\`\`\n${s}\n\`\`\`\n`
}

export function createUpgradeRNPrompts({ from, to, file, contents, diff }: UpgradeReactNativePrompts) {
  // now create a prompt for OpenAI to convert the file
  const orientation = `
    You are a helper bot that is helping a developer upgrade their React Native app
    from ${from} to ${to}.
  `

  const convertPrompt = `
    With this file located at ${file}:

    ${code(contents)}

    We have a diff to apply, but it was generated for a non-modified version of this file.

    ${code(diff)}

    Apply the changes in the diff to the file.
  `

  const admonishments = `
    IMPORTANT NOTES:
    * If the existing file has modifications and the diff doesn't apply cleanly, then figure out how to apply the diff to the modified file.
    * Intelligently determine what needs to change to capture the spirit of the change.
    * Match the style of the existing code, including indentation, quotation style, spacing,
    and line breaks.
    * Make sure to properly make changes to code comments as well.
    * Make sure to make all the changes in the diff that apply to this file.
    * When a comment is marked as deleted in the diff, make sure to delete that comment in the file too.
    * If no changes are needed, just say "None needed" and don't change the file.
  `

  return {
    orientation,
    convertPrompt,
    admonishments,
  }
}
