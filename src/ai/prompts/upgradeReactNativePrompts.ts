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

  const prompt = `
    With this file located at ${file}:

    ${code(contents)}

    We have a diff to apply, but it was generated for a non-modified version of this file.

    ${code(diff)}
  `

  const admonishments = `
    Bias toward keeping existing modifications to the existing code, except for things that
    are specifically called out as needing to be changed in the diff.

    Match the style of the existing code, including indentation, quotation style, spacing,
    and line breaks.
          
    If no changes are needed, just say "None needed" and don't change the file.
  `

  return {
    orientation,
    prompt,
    admonishments,
  }
}
