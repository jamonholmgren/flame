import { GluegunCommand } from 'gluegun'
import { chatGPTPrompt } from '../../ai/openai'
import { parseGitDiff } from '../../utils/parseGitDiff'
import { ChatCompletionFunction } from '../../types'
import { patch } from '../../ai/functions/patch'
import { createFile } from '../../ai/functions/createFile'
import { handleFunctionCall } from '../../ai/functions/handleFunctionCall'
import { createUpgradeRNPrompts } from '../../ai/prompts/upgradeReactNativePrompts'
import { spin, done, stop, error } from '../../utils/spin'

const ignoreFiles = [
  'README.md',
  // more files here if needed
]

const command: GluegunCommand = {
  name: 'react-native',
  alias: ['rn'],
  run: async (toolbox) => {
    const { print, filesystem, http, parameters } = toolbox
    const { options } = parameters

    // Retrieve the path of the folder to upgrade, default current folder.
    const dir = parameters.first || './'

    // Fetch the versions from the --from and --to options, or default to auto
    let currentVersion = options.from || 'auto'
    let targetVersion = options.to || 'auto'

    spin('Fetching versions')

    // Load up the package.json file from the provided folder path
    const packageJson = await filesystem.readAsync(`${dir}/package.json`, 'json')

    // Get the current version from package.json if auto
    if (currentVersion === 'auto') currentVersion = packageJson.dependencies['react-native']

    // Get the target version from npm if auto
    if (targetVersion === 'auto') {
      const npmResponse = await http.create({ baseURL: 'https://registry.npmjs.org' }).get(`/react-native`)
      const npmPackageJson = npmResponse.data as { 'dist-tags': { latest: string } }
      targetVersion = npmPackageJson['dist-tags'].latest
    }

    const appJson = await filesystem.readAsync(`${dir}/app.json`, 'json')

    const appNameKebabCase = packageJson.name
    const appDisplayName = appJson.displayName
    const appNameLowercase = appDisplayName.toLowerCase()

    // if targetVersion and currentVersion are the same, we're already on the latest version
    if (targetVersion === currentVersion) {
      stop('🙂', `You're already on version ${currentVersion}.`)
      return
    }

    done('Versions fetched: ' + currentVersion + ' -> ' + targetVersion)

    // fetch the React Native Upgrade Helper diff
    spin('Fetching upgrade diff')

    // format: https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/0.70.5..0.71.4.diff
    const baseURL = `https://raw.githubusercontent.com`
    const diffPath = `/react-native-community/rn-diff-purge/diffs/diffs/${currentVersion}..${targetVersion}.diff`
    const diffResponse = await http.create({ baseURL }).get(diffPath)
    const diff = diffResponse.data as string | null

    // if the diff is null, we don't have a diff for this
    if (!diff) {
      error(`We don't have a diff for upgrading from ${currentVersion} to ${targetVersion}.`)
      print.info(`URL: ${baseURL + diffPath}`)
      return
    }

    done('Diff fetched from ' + baseURL + diffPath)

    // pull the files that changed from the git diff
    const files = parseGitDiff(diff)

    // if they pass --list, just list the files and exit
    if (options.list) {
      for (const f in files) print.success(f)
      return
    }

    spin('Converting files')

    // loop through each file and ask OpenAI to convert it using the diff for that file
    for (const file in files) {
      const fileDiff = files[file]
        .replace(/RnDiffApp/g, appDisplayName)
        .replace(/rndiffapp/g, appNameLowercase)
        .replace('rn-diff-app', appNameKebabCase)

      // TODO: have the AI figure out which files need to be modified/renamed/etc

      // Ignore binary files and files in ignoreFiles list
      if (fileDiff.includes('GIT binary patch')) {
        stop('🙈', `Skipping binary patch for ${file}`)
        continue
      }

      if (ignoreFiles.find((v) => file.includes(v))) {
        stop('🙈', `Ignoring ${file}`)
        continue
      }

      // if they pass --only, only convert the file they specify
      if (options.only && !file.includes(options.only)) {
        stop('🙈', `Skipping ${file}`)
        continue
      }

      // Replace the RnDiffApp placeholder with the app name
      const localFile = file
        .replace(/^RnDiffApp/, '.')
        .replace(/RnDiffApp/g, appDisplayName)
        .replace(/rndiffapp/g, appNameLowercase)
        .replace('rn-diff-app', appNameKebabCase)

      // Restart the spinner for the next file
      spin(`Converting ${localFile}`)

      // load the file from the filesystem
      const sourceFileContents = await filesystem.readAsync(localFile)

      // if the file doesn't exist, skip it
      if (!sourceFileContents) {
        stop('🙈', `Couldn't find ${localFile}, skipping`)
        continue
      }

      const { orientation, prompt, admonishments } = createUpgradeRNPrompts({
        from: currentVersion,
        to: targetVersion,
        file: localFile,
        contents: sourceFileContents,
        diff: fileDiff,
      })

      try {
        // We'll let the AI patch files and create files
        const functions: ChatCompletionFunction[] = [patch, createFile]

        const convertedObj = await chatGPTPrompt({
          functions,
          messages: [
            { content: orientation, role: 'system' },
            { content: prompt, role: 'user' },
            { content: admonishments, role: 'system' },
          ],
          model: 'gpt-4',
        })

        console.log({ convertedObj })

        await handleFunctionCall(convertedObj, functions)

        stop('✅', `Converted ${localFile}.`)
      } catch (e) {
        // catching any conversion errors
        print.error(e.response.data)
      }
    }

    // Final success message
    print.success('All files converted successfully!')
  },
}

module.exports = command
