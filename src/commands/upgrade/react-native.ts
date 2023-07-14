import { GluegunCommand } from 'gluegun'
import { chatGPTPrompt } from '../../ai/openai'
import { retryOnFail } from '../../utils/retryOnFail'
import { parseGitDiff } from '../../utils/parseGitDiff'
import { ChatCompletionFunctions } from 'openai'

const ignoreFiles = ['README.md' /* more files here if needed */]

type ChatCompletionFunction = ChatCompletionFunctions & { fn: (args: any) => void }

// Helper function to handle function calls
async function handleFunctionCall(response, functions) {
  if (response.function_call) {
    const functionName = response.function_call.name
    const functionArgs = JSON.parse(response.function_call.arguments)

    // Look up function in the registry and call it with the parsed arguments
    const func = functions.find((f) => f.name === functionName)

    if (func) {
      await func.fn(functionArgs)
    } else {
      console.error(`Function '${functionName}' is not registered.`)
    }
  }
}

const command: GluegunCommand = {
  name: 'react-native',
  alias: ['rn'],
  run: async (toolbox) => {
    const { print, filesystem, http, parameters } = toolbox
    const { options } = parameters

    // Register the functions that can be called from the AI
    const functions: ChatCompletionFunction[] = [
      // Create a file
      {
        name: 'createFile',
        description: 'Create a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path of the file to create.',
            },
            contents: {
              type: 'string',
              description: 'The contents of the file to create.',
            },
          },
        },
        fn: async (args) => {
          // Create the file
          await filesystem.writeAsync(args.path, args.contents)
        },
      },
      {
        name: 'error',
        description: 'Log an error message to the console',
        parameters: {
          type: 'object',
          properties: {
            contents: {
              type: 'string',
              description: 'The message to error to the console.',
            },
          },
          required: ['contents'],
        },
        fn: (args) => {
          console.error(args)
        },
      },
      {
        name: 'prettyPrint',
        description: 'Pretty print a JSON object to the console',
        parameters: {
          type: 'object',
          properties: {
            contents: {
              type: 'object',
              additionalProperties: true,
              description: 'The JSON object to pretty print.',
            },
          },
          required: ['contents'],
        },
        fn: (args) => {
          console.dir(args)
        },
      },
    ]

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
    const appJson = await filesystem.readAsync(`${folderToUpgrade}/app.json`, 'json')
    const appDisplayName = appJson.displayName
    const appNameLowercase = appDisplayName.toLowerCase()

    // if targetVersion and currentVersion are the same, we're already on the latest version
    if (targetVersion === currentVersion) {
      versionSpinner.stopAndPersist({
        symbol: '🙂',
        text: `You're already on version ${currentVersion}.`,
      })
      return
    }

    // Stop the spinner, and mark as successful
    versionSpinner.succeed('Versions fetched: ' + currentVersion + ' -> ' + targetVersion)

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
      diffSpinner.fail(
        `We don't have a diff for upgrading from ${currentVersion} to ${targetVersion}.`
      )
      print.info(`URL: ${baseURL + diffPath}`)
      return
    }

    // Stop the spinner, and mark as successful
    diffSpinner.succeed('Diff fetched from ' + baseURL + diffPath)

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
      const fileDiff = files[file]

      // Ignore binary files and files in ignoreFiles list
      if (fileDiff.includes('GIT binary patch')) {
        fileSpinner.stopAndPersist({
          symbol: '🙈',
          text: `Skipping binary patch for ${file}`,
        })
        continue
      }

      if (ignoreFiles.find((v) => file.includes(v))) {
        fileSpinner.stopAndPersist({
          symbol: '🙈',
          text: `Ignoring ${file}`,
        })
        continue
      }

      // if they pass --only, only convert the file they specify
      if (options.only && !file.includes(options.only)) {
        fileSpinner.stopAndPersist({
          symbol: '🙈',
          text: `Skipping ${file}`,
        })
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
      if (!sourceFileContents) {
        fileSpinner.stopAndPersist({
          symbol: '🙈',
          text: `Couldn't find ${localFile}, skipping`,
        })
        continue
      }

      // Now use OpenAI to convert the file
      const diffPrompt = `
Using this git diff of a typical ${file} in a React Native ${currentVersion} app being upgraded to ${targetVersion}:

\`\`\`
${fileDiff}
\`\`\`

... explain to me in bullet points what needs to be done to the file, assuming that the file we're
applying it to might have customizations we would want to keep. Assume your audience is yourself,
for a future chat session where you will not have any other context. Give specific instructions,
not general instructions.
    `

      // print.info(diffPrompt)

      var instructions = await retryOnFail(() =>
        chatGPTPrompt({
          messages: [
            {
              content: diffPrompt,
              role: 'system',
            },
          ],
          model: 'gpt-3.5-turbo',
        })
      )

      instructions = instructions.content

      // make sure we got instructions
      if (!instructions || instructions.startsWith('ERROR:')) {
        print.error(`No instructions for ${localFile}.`)
        fileSpinner.stopAndPersist({
          symbol: '🙈',
          text: `Skipping binary patch for ${file}`,
        })
        continue
      }

      // now create a prompt for OpenAI to convert the file
      const orientation = `
You are a helper bot that is helping a developer upgrade their React Native app
from ${currentVersion} to ${targetVersion} using a Node script.
This script will use your response to convert the file ${localFile}.
`

      const prompt = `
With this file named ${localFile}:

\`\`\`
${sourceFileContents}
\`\`\`

The git diff for an unmodified React Native app between those versions looks like this:

\`\`\`diff
${fileDiff}
\`\`\`

According to a previous chat session, the following instructions to apply the changes in this diff
were given below; however, keep in mind that GPT-3.5 was used to generate these, so they may not be perfect.

${instructions}

Bias toward keeping existing modifications to the existing code, except for things that
are specifically called out as needing to be changed in the diff.
`

      const admonishments = `
IMPORTANT NOTES:

Return the new file in a code block, formatted and indented correctly so we can save it back to the original file.
Return only the full file contents and no other explanation or notes.
If there is no changes necessary, just say "NO CHANGES NEEDED FOR UPGRADE" and that is it, don't do anything else.
Our tool relies on detecting the string "NO CHANGES NEEDED FOR UPGRADE" for no changes.

Do not output "Here is the modified file" or anything like it.
We only want the modified code for upgrading! This is important!
If you output additional text, our tool will not be able to extract the
modified code and replace the original code with it.

If you output three backticks before and after, we will simply strip them before
saving them to the file. So you can use them for formatting if you want.
`

      try {
        var convertedObj = await chatGPTPrompt({
          functions,
          messages: [
            // {
            //   content: orientation,
            //   role: 'system',
            // },
            // {
            //   content: prompt,
            //   role: 'user',
            // },
            // {
            //   content: admonishments,
            //   role: 'system',
            // },
            {
              content: `Make a file that contains the text "Hello, world!" and save it as ./hello.txt`,
              role: 'user',
            },
          ],
          model: 'gpt-4',
        })

        console.log({ convertedObj })
        var converted = convertedObj.content

        await handleFunctionCall(convertedObj, functions)

        process.exit(0)
      } catch (e) {
        // catching any conversion errors
        print.error(e)
        print.error(e.response.data.error)
      }

      // if we didn't get a converted file, continue
      if (!converted) {
        fileSpinner.stopAndPersist({
          symbol: '🙈',
          text: `No conversion generated for ${localFile}.`,
        })
        continue
      } else if (converted.includes('NO CHANGES NEEDED FOR UPGRADE')) {
        // if the file didn't need to be changed, mark it as such
        fileSpinner.stopAndPersist({
          symbol: '🙈',
          text: `No changes needed for ${localFile}.`,
        })
      } else {
        // strip out the backticks only from the beginning and end of the converted file
        // also strip any newlines from the beginning (only) of the file
        const newContents = converted.replace(/^```/, '').replace(/```$/, '').replace(/^\n/, '')

        // write the file to the filesystem
        await filesystem.writeAsync(localFile, newContents)

        // Stop the spinner and mark the file as converted before continuing to the next file
        fileSpinner.succeed(`Converted ${localFile}`)
      }
    }

    // Final success message
    print.success('All files converted successfully!')
  },
}

module.exports = command