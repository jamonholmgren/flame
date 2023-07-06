import { GluegunCommand } from 'gluegun'
import { chatGPTPrompt } from '../../ai/openai'

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
  name: 'react-native',
  alias: ['rn'],
  run: async (toolbox) => {
    const { print, filesystem, http, parameters } = toolbox
    const { options } = parameters

    // Retrieve the path of the folder to upgrade. If not provided, use the current folder.
    const folderToUpgrade = parameters.first || './'

    // Fetch the versions from the --from and --to options.
    // If not provided, default to 'auto'.
    let currentVersion = options.from || 'auto'
    let targetVersion = options.to || 'auto'

    // Start the version fetching spinner
    const versionSpinner = print.spin('Fetching versions')

    // Load up the package.json file from the provided folder path
    const packageJson = await filesystem.readAsync(`${folderToUpgrade}/package.json`, 'json')

    // Get the current version if auto
    if (currentVersion === 'auto') {
      // get the current version of react-native from package.json
      currentVersion = packageJson.dependencies['react-native']
    }

    // Get the target version if auto
    if (targetVersion === 'auto') {
      // get the latest version of react-native from npm
      const npmResponse = await http
        .create({ baseURL: 'https://registry.npmjs.org' })
        .get(`/react-native`)
      const npmPackageJson = npmResponse.data as { 'dist-tags': { latest: string } }
      targetVersion = npmPackageJson['dist-tags'].latest
    }

    const appNameKebabCase = packageJson.name
    const appJson = await filesystem.readAsync('app.json', 'json')
    const appDisplayName = appJson.displayName
    const appNameLowercase = appDisplayName.toLowerCase()

    // if targetVersion and currentVersion are the same, we're already on the latest version
    if (targetVersion === currentVersion) {
      print.error(`You're already on version ${currentVersion}.`)
      return
    }

    // Stop the spinner, and mark as successful
    versionSpinner.succeed('Versions fetched')

    // fetch the React Native Upgrade Helper diff
    // format: https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/0.70.5..0.71.4.diff
    const baseURL = `https://raw.githubusercontent.com`
    const diffPath = `/react-native-community/rn-diff-purge/diffs/diffs/${currentVersion}..${targetVersion}.diff`

    // Start the diff fetching spinner
    const diffSpinner = print.spin('Fetching upgrade diff')

    const diffResponse = await http.create({ baseURL }).get(diffPath)
    const diff = diffResponse.data as string

    // if the diff is null, we don't have a diff for this
    if (!diff) {
      print.error(`We don't have a diff for upgrading from ${currentVersion} to ${targetVersion}.`)
      print.info(`URL: ${baseURL + diffPath}`)
      return
    }

    // Stop the spinner, and mark as successful
    diffSpinner.succeed('Diff fetched')

    // pull the files that changed from the git diff
    const files = parseGitDiff(diff)

    // if they pass --list, just list the files and exit
    if (options.list) {
      for (const file in files) {
        print.success(file)
      }
      return
    }

    // Start the file conversion spinner
    const fileSpinner = print.spin('Converting files')

    // loop through each file and ask OpenAI to convert it using the diff for that file
    for (const file in files) {
      const diff = files[file]

      // Skip binary files
      if (diff.includes('GIT binary patch')) {
        // TODO: try to use git to convert the binary file instead?
        print.warning(`Skipping binary file: ${file}`)
        continue
      }

      // our localFile replaces RNDiffApp at the beginning with "" using a regex
      // and in the middle with our app display name
      // and rndiffapp with our own name
      const localFile = file
        .replace(/^RnDiffApp/, '.')
        .replace(/RnDiffApp/g, appDisplayName)
        .replace(/RnDiffApp/g, appDisplayName)
        .replace(/rndiffapp/g, appNameLowercase)
        .replace('rn-diff-app', appNameKebabCase)

      // Restart the spinner for the next file
      fileSpinner.text = `Converting ${localFile}`
      fileSpinner.start()

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
        var instructions = await chatGPTPrompt({
          messages: [
            {
              content: diffPrompt,
              role: 'system',
            },
          ],
          model: 'gpt-3.5-turbo',
        })
      } catch (e) {
        print.error(e)
        print.error(e.response.data.error)
      }

      // make sure we got instructions
      if (!instructions) {
        print.error(`No instructions for ${localFile}.`)
        continue
      } else {
        print.info(instructions)
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
        var converted = await chatGPTPrompt({
          messages: [
            {
              content: conversionPrompt,
              role: 'system',
            },
          ],
          model: 'gpt-4',
        })
      } catch (e) {
        // catching any conversion errors
        print.error(e)
        print.error(e.response.data.error)
      }

      // if we didn't get a converted file, continue
      if (!converted) {
        print.error(`No conversion for ${localFile}.`)
        continue
      } else {
        // write the file to the filesystem
        filesystem.write(localFile, converted)

        // Stop the spinner and mark the file as converted before continuing to the next file
        fileSpinner.succeed(`Converted ${localFile}`)
      }
    }

    // Final success message
    print.success('All files converted successfully!')
  },
}

module.exports = command
