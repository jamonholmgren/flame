import { GluegunCommand } from 'gluegun'
import { chatGPTPrompt } from '../../ai/openai'
import { parseGitDiff } from '../../utils/parseGitDiff'
import { ChatCompletionFunction } from '../../types'
import { patch } from '../../ai/functions/patch'
import { createFile } from '../../ai/functions/createFile'
import { createUpgradeRNPrompts } from '../../ai/prompts/upgradeReactNativePrompts'
import { spin, done, hide, stop, error } from '../../utils/spin'

const ignoreFiles = [
  'README.md',
  // more files here if needed
]

const command: GluegunCommand = {
  name: 'react-native',
  alias: ['rn'],
  run: async (toolbox) => {
    const { print, filesystem, http, parameters, prompt } = toolbox
    const { options } = parameters
    const { colors } = print
    const { gray, red, cyan, white, bold } = colors

    const log = (t: any) => options.debug && console.log(t)
    const info = (label: string, content: string) =>
      print.info(`🔥 ${gray(label.padEnd(8))} ${white(content)}`)
    const br = () => print.info('')
    const hr = () => print.info('\n===================================================\n')

    // Retrieve the path of the folder to upgrade, default current folder.
    const dir = parameters.first || './'

    // Fetch the versions from the --from and --to options, or default to auto
    let currentVersion = options.from || 'auto'
    let targetVersion = options.to || 'auto'

    hr()
    print.info(`🔥 ${bold(red('Flame AI:'))} ${gray('Ignite your code with the power of AI.')}`)
    hr()
    info('App:', filesystem.path(dir))
    info('Mode:', options.interactive ? `Interactive` : `Upgrade`)

    spin('Fetching app info')

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
      print.info(`   If you need to specify a particular version, use the --from and --to options.`)
      return
    }

    // done('Versions fetched: ' + currentVersion + ' -> ' + targetVersion)
    hide()

    info('Current:', bold(currentVersion))
    info('Upgrade:', bold(targetVersion))

    // fetch the React Native Upgrade Helper diff
    spin('Fetching upgrade diff')

    // format: https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/0.70.5..0.71.4.diff
    const baseURL = `https://raw.githubusercontent.com`
    const diffPath = `/react-native-community/rn-diff-purge/diffs/diffs/${currentVersion}..${targetVersion}.diff`
    const diffResponse = await http.create({ baseURL }).get(diffPath)
    const diff = diffResponse.data as string | null

    // if the diff is null, we don't have a diff for this
    if (!diff) {
      error(`\n   We don't have a diff for upgrading from ${currentVersion} to ${targetVersion}.\n`)
      print.info(`   URL: ${baseURL + diffPath}`)
      return
    }

    // done('Diff fetched from ' + baseURL + diffPath)
    hide()

    info('Diff:', baseURL + diffPath)

    // pull the files that changed from the git diff
    const files = parseGitDiff(diff)

    // if they pass --list, just list the files and exit
    if (options.list) {
      for (const f in files) print.success(f)
      return
    }

    hr()
    print.info(bold(white(`Starting ${cyan('React Native')} upgrade using ${red(bold('Flame AI'))}\n`)))

    let userWantsToExit = false

    // loop through each file and ask OpenAI to convert it using the diff for that file
    for (const file in files) {
      const fileDiff = files[file]
        .replace(/RnDiffApp/g, appDisplayName)
        .replace(/rndiffapp/g, appNameLowercase)
        .replace('rn-diff-app', appNameKebabCase)

      // TODO: have the AI figure out which files need to be modified/renamed/etc

      // Ignore binary files and files in ignoreFiles list
      if (fileDiff.includes('GIT binary patch')) {
        // stop('🙈', `Skipping binary patch for ${file}`)
        print.info(`↠ Skipping: ${file} (binary file)`)
        br()
        continue
      }

      if (ignoreFiles.find((v) => file.includes(v))) {
        print.info(`↠ Ignoring: ${file}`)
        br()
        continue
      }

      // if they pass --only, only convert the file they specify
      if (options.only && !file.includes(options.only)) {
        print.info(`↠ Skipping: ${file}`)
        br()
        continue
      }

      // Replace the RnDiffApp placeholder with the app name
      const localFile = file
        .replace(/^RnDiffApp/, '.')
        .replace(/RnDiffApp/g, appDisplayName)
        .replace(/rndiffapp/g, appNameLowercase)
        .replace('rn-diff-app', appNameKebabCase)

      // load the file from the filesystem
      const sourceFileContents = await filesystem.readAsync(localFile)

      // if the file doesn't exist, skip it
      if (!sourceFileContents) {
        // stop('🙈', `Couldn't find ${localFile}, skipping`)
        print.info(`↠ Skipping: ${localFile} (file not found)`)
        br()
        continue
      }

      // stop the spinner temporarily to ask the user a question
      hide()
      print.info(`${bold('■ File: ')} ${localFile}`)
      br()

      // check if the user wants to convert the next file or skip this file
      const skipFile = await prompt.ask({
        type: 'select',
        name: 'skipFile',
        message: 'Do you want to upgrade this file?',
        choices: [
          { message: `Start upgrading ${localFile}`, name: 'upgrade' },
          { message: 'Skip this file', name: 'skip' },
          { message: 'Exit', name: 'exit' },
        ],
      })

      br()

      log({ skipFile })

      if (skipFile?.skipFile === 'skip') {
        continue
      } else if (skipFile?.skipFile === 'exit') {
        userWantsToExit = true
        break
      } // else, we're good!

      const { orientation, convertPrompt, admonishments } = createUpgradeRNPrompts({
        from: currentVersion,
        to: targetVersion,
        file: localFile,
        contents: sourceFileContents,
        diff: fileDiff,
      })

      let userSatisfied = false
      const additionalInstructions = []
      while (!userSatisfied) {
        try {
          // Restart the spinner for the current file
          spin(`Upgrading ${localFile}`)

          // We'll let the AI patch files and create files
          const functions: ChatCompletionFunction[] = [patch, createFile]

          const response = await chatGPTPrompt({
            functions,
            messages: [
              { content: orientation, role: 'system' },
              { content: convertPrompt, role: 'user' },
              ...additionalInstructions.map((i) => ({
                content: `In addition: ${i}`,
                role: 'user' as const,
              })),
              { content: admonishments, role: 'system' },
            ],
            model: 'gpt-4',
          })

          hide()

          log({ response })

          if (!response.function_call) {
            // If there's no function call, maybe there's content to display?
            if (response.content) {
              print.info(response.content)

              // if we're being rate limited, we need to stop for a bit and try again
              if (response.content.includes('too_many_requests')) {
                print.error(`🛑 I'm being rate limited. Wait a while and try again.\n`)
                await prompt.confirm('Press enter to continue')
              } else if (response.content.includes('context_length_exceeded')) {
                print.error(
                  `🛑 This file is too long (${sourceFileContents.length} characters), skipping! Not enough tokens to convert it.`
                )
                userSatisfied = true
              }
            }
            continue
          }

          const functionName = response.function_call.name
          const functionArgs = JSON.parse(response.function_call.arguments)

          // Look up function in the registry and call it with the parsed arguments
          const func = functions.find((f) => f.name === functionName)

          // If there's no function, maybe there's content to display? Print the content and let them respond again
          if (!func) {
            if (response.content) print.info(response.content)
            continue
          }

          const result = await func.fn(functionArgs)

          log({ result })

          done(`I've made changes to the file ${localFile}.`)
          br()

          // interactive mode allows the user to undo the changes and give more instructions
          if (options.interactive) {
            const keepChanges = await prompt.ask({
              type: 'select',
              name: 'keepChanges',
              message: 'Go check your editor and see if you like the changes.',
              choices: [
                { message: 'Looks good! Next file please', name: 'next' },
                { message: 'Not quite right. undo changes and try again', name: 'retry' },
                { message: 'Not quite right, undo changes and skip to the next file', name: 'skip' },
                { message: 'Keep changes and exit', name: 'keepExit' },
                { message: 'Undo changes and exit', name: 'undoExit' },
              ],
            })

            log({ keepChanges })

            if (keepChanges?.keepChanges === 'next') {
              userSatisfied = true
            } else if (keepChanges?.keepChanges === 'skip') {
              userSatisfied = true
              await result.undo()
              br()
              print.info(`↺  Changes to ${localFile} undone.`)
            } else if (keepChanges?.keepChanges === 'keepExit') {
              userSatisfied = true
              userWantsToExit = true
            } else if (keepChanges?.keepChanges === 'undoExit') {
              userSatisfied = true
              userWantsToExit = true
              await result.undo()
              br()
              print.info(`↺  Changes to ${localFile} undone.`)
            } else if (keepChanges?.keepChanges === 'retry') {
              br()
              print.info('⇾ Any instructions to help me convert this file better?')
              br()
              additionalInstructions.forEach((i) => print.info(gray(`   ${i}\n`)))

              const nextInstructions = await prompt.ask({
                type: 'input',
                name: 'nextInstructions',
                message: 'Prompt',
              })

              // typing "exit" always gets out of the CLI
              if (nextInstructions?.nextInstructions === 'exit') {
                userWantsToExit = true
                break
              }

              // undo the changes made so we can try again
              await result.undo()

              additionalInstructions.push(nextInstructions.nextInstructions)
            } else {
              br()
              print.error(`Something went wrong.`)
              log({ keepChanges })
            }
          }
        } catch (e) {
          // catching any conversion errors
          br()
          print.error(e.response.data)
        }
      }

      br()

      if (userWantsToExit) break
    }

    // Final success message
    print.success('All files converted successfully!')
  },
}

module.exports = command
