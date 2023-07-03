import { GluegunCommand } from 'gluegun'
import { claudePrompt } from '../ai/claude'

// parse out all the files that were changed in the diff, returning an array of file paths and names
function parseGitDiff(diffString: string) {
  const lines = diffString.split('\n')
  const files = {} as { [key: string]: string }
  let currentFile = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('diff --git')) {
      const match = line.match(/diff --git a\/(.+) b\/(.+)/)
      if (match) {
        const fileName = match[2]
        currentFile = fileName
        files[currentFile] = ''
      }
    } else if (currentFile !== null) {
      files[currentFile] += line + '\n'
    }
  }

  return files
}

const command: GluegunCommand = {
  name: 'rnupgrade',
  run: async (toolbox) => {
    const { print, filesystem, http, parameters } = toolbox
    const { options } = parameters

    // first parameter is the version we want to upgrade to
    const targetVersion = toolbox.parameters.first

    // second optional parameter is a string to match against the filename to limit to just that string
    const filter = toolbox.parameters.second

    // fetch the current version from package.json
    const packageJson = await filesystem.readAsync('package.json', 'json')
    const currentVersion = packageJson.dependencies['react-native']
    const appNameKebabCase = packageJson.name
    const appJson = await filesystem.readAsync('app.json', 'json')
    const appDisplayName = appJson.displayName
    const appNameLowercase = appDisplayName.toLowerCase()

    // if targetVersion and currentVersion are the same, we're already on the latest version
    if (targetVersion === currentVersion) {
      print.error(`You're already on version ${currentVersion}.`)
      return
    }

    // fetch the React Native Upgrade Helper diff
    // format: https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/0.70.5..0.71.4.diff
    const baseURL = `https://raw.githubusercontent.com`
    const diffPath = `/react-native-community/rn-diff-purge/diffs/diffs/${currentVersion}..${targetVersion}.diff`
    const diffResponse = await http.create({ baseURL }).get(diffPath)
    const diff = diffResponse.data as string

    // if the diff is null, we don't have a diff for this
    if (!diff) {
      print.error(
        `We don't have a diff for upgrading from ${currentVersion} to ${targetVersion}.`
      )
      print.info(`URL: ${baseURL + diffPath}`)
      return
    }

    const files = parseGitDiff(diff)

    // if they pass --list, just list the files and exit
    if (options.list) {
      for (const file in files) {
        if (filter && !file.includes(filter)) continue
        print.success(file)
      }
      return
    }

    // loop through each file and ask OpenAI to convert it using the diff for that file
    for (const file in files) {
      const diff = files[file]

      if (filter && !file.includes(filter)) continue

      // our localFile replaces RNDiffApp at the beginning with "" using a regex
      // and in the middle with our app display name
      // and rndiffapp with our own name
      const localFile = file
        .replace(/^RnDiffApp/, '.')
        .replace(/RnDiffApp/g, appDisplayName)
        .replace(/RnDiffApp/g, appDisplayName)
        .replace(/rndiffapp/g, appNameLowercase)
        .replace('rn-diff-app', appNameKebabCase)

      print.success(localFile)

      // load the file from the filesystem
      const sourceFileContents = await filesystem.readAsync(localFile)

      // if the file doesn't exist, skip it
      if (!sourceFileContents) continue

      // Now use OpenAI to convert the file
      const diffPrompt = `
Using this git diff of a typical ${file} in a React Native ${currentVersion} app being upgraded to ${targetVersion}:

\`\`\`
${diff}
\`\`\`

... explain to me in bullet points what needs to be done to the file, assuming that the file we're
applying it to might have customizations we would want to keep. Assume your audience is yourself,
for a future chat session where you will not have any other context. Give specific instructions,
not general instructions.
`

      print.info(diffPrompt)

      try {
        var instructions = await claudePrompt({
          prompt: diffPrompt,
          backticks: false,
        })
      } catch (e) {
        print.error(e)
        print.error(e.response.data.error)
      }

      // make sure we got instructions
      if (!instructions.completion) {
        print.error(`No instructions for ${localFile}.`)
        continue
      } else {
        print.info(instructions.completion)
      }

      // now create a prompt for OpenAI to convert the file
      const conversionPrompt = `
With this file named ${localFile}:

\`\`\`
${sourceFileContents}
\`\`\`

Apply these instructions:

${instructions}

Return the new file in a code block, formatted and indented correctly.
`

      try {
        var converted = await claudePrompt({
          prompt: conversionPrompt,
          backticks: true,
        })
      } catch (e) {
        print.error(e)
        print.error(e.response.data.error)
      }

      // const revampedCode = openAIResponse.data.choices[0].message
      const revampedCode = converted.completion

      // write it back to the file
      await filesystem.writeAsync(localFile, revampedCode)

      print.success(`Converted ${localFile}!`)
    }
  },
}

module.exports = command
