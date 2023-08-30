import { GluegunCommand } from 'gluegun'
import { chatGPTPrompt } from '../../ai/openai'
import { parseGitDiff } from '../../utils/parseGitDiff'
import { ChatCompletionFunction } from '../../types'
import { patch } from '../../ai/functions/patch'
import { createFile } from '../../ai/functions/createFile'
import { deleteFile } from '../../ai/functions/deleteFile'
import { createUpgradeRNPrompts } from '../../ai/prompts/upgradeReactNativePrompts'
import { spin, done, hide, stop, error } from '../../utils/spin'
import { summarize } from '../../utils/summarize'
import { checkGitStatus } from '../../utils/checkGitStatus'
import { coloredDiff } from '../../utils/coloredDiff'
import { ChatCompletionRequestMessage, ChatCompletionResponseMessage } from 'openai'
import { fetchRNAppInfo } from '../../react-native/fetchRNAppInfo'
import { br, flame, hr, info } from '../../utils/out'
import { fetchRNDiff } from '../../react-native/fetchRNDiff'
import { isFileIgnored } from '../../react-native/isFileIgnored'
import { keepChangesMenu } from '../../interactive/keepChangesMenu'
import { callFunction } from '../../interactive/callFunction'

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

    // Retrieve the path of the folder to upgrade, default current folder.
    const dir = parameters.first || './'

    // Make sure the git repo is clean before we start (warn if not)
    await checkGitStatus(toolbox)

    const seeDiffs = options.diffs !== false

    hr()
    flame()

    print.info(`🔥 ${bold(red('Flame AI:'))} ${gray('Ignite your code with the power of AI.')}`)
    hr()
    info('App:', filesystem.path(dir))
    info('Mode:', options.interactive ? `Interactive` : `Upgrade`)

    spin('Fetching app info')
    const appInfo = await fetchRNAppInfo({ dir, options })
    if (appInfo.error) return stop('🙈', appInfo.error)
    const { currentVersion, targetVersion, replacePlaceholder } = appInfo
    hide()

    info('Current:', bold(currentVersion))
    info('Upgrade:', bold(targetVersion))

    spin('Fetching upgrade diff')
    const { files, error: diffError } = await fetchRNDiff({ currentVersion, targetVersion })
    if (diffError) return stop('🙈', diffError)
    hide()

    // if they pass --list, just list the files and exit
    if (options.list) {
      for (const f in files) print.success(f)
      return
    }

    hr()

    print.info(bold(white(`Starting ${cyan('React Native')} upgrade using ${red(bold('Flame AI'))}\n`)))

    let userWantsToExit = false
    for (const fileData of files) {
      const fileDiff = replacePlaceholder(fileData.diff)
      const localFile = replacePlaceholder(fileData.path)

      if (isFileIgnored({ ignoreFiles, only: options.only, fileData })) continue

      // load the file from the filesystem
      const sourceFileContents = await filesystem.readAsync(localFile)

      // if the file doesn't exist, skip it
      if (!sourceFileContents) {
        // stop('🙈', `Couldn't find ${localFile}, skipping`)
        print.info(`↠ Skipping: ${localFile} (file not found)`)
        br()
        fileData.change = 'skipped'
        fileData.error = 'file not found'
        continue
      }

      // stop the spinner temporarily to ask the user a question
      hide()
      print.info(`${bold('■ File: ')} ${localFile}`)
      br()

      // check if the user wants to convert the next file or skip this file
      let skipFile = 'upgrade'
      if (options.interactive) {
        if (seeDiffs) print.info(white('Upgrade Helper diff:\n\n') + coloredDiff(fileDiff) + '\n')

        const skipAnswer = await prompt.ask({
          type: 'select',
          name: 'skipFile',
          message: 'Do you want to upgrade this file?',
          choices: [
            { message: `Start upgrading ${localFile}`, name: 'upgrade' },
            { message: 'Skip this file', name: 'skip' },
            { message: 'Exit', name: 'exit' },
          ],
        })

        skipFile = skipAnswer['skipFile']
      }

      br()

      log({ skipFile })

      if (skipFile === 'skip') {
        fileData.change = 'skipped'
        continue
      } else if (skipFile === 'exit') {
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

      let doneWithFile = false
      while (!doneWithFile) {
        // Restart the spinner for the current file
        spin(`Upgrading ${localFile}`)

        // We'll let the AI patch files and create files
        const functions: ChatCompletionFunction[] = [patch, createFile, deleteFile]

        const messages: ChatCompletionRequestMessage[] = [
          { content: orientation, role: 'system' },
          { content: convertPrompt, role: 'user' },
          ...fileData.customPrompts.map((i) => ({
            content: `In addition: ${i}`,
            role: 'user' as const,
          })),
          { content: admonishments, role: 'system' },
        ]

        let aiResponse: ChatCompletionResponseMessage = undefined

        if (options.cacheFile) {
          const cacheFile = options.cacheFile
          // load the existing cache file
          const cacheData = await filesystem.readAsync(cacheFile, 'json')
          // check if a recording for this request exists
          if (cacheData?.request[localFile]) {
            aiResponse = cacheData.request[localFile]
          }
        }

        if (aiResponse) {
          // delay briefly to simulate a real request
          await new Promise((resolve) => setTimeout(resolve, 2500))
          stop('🔥', `Using cached response for ${localFile}`)
        } else {
          aiResponse = await chatGPTPrompt({
            functions,
            messages,
            model: 'gpt-4',
          })

          if (options.cacheFile) {
            // load the existing cache file
            const cacheData = (await filesystem.readAsync(options.cacheFile, 'json')) || { request: {} }

            // add the request and response to the cache file
            cacheData.request[localFile] = aiResponse

            // write it back
            await filesystem.writeAsync(options.cacheFile, cacheData, { jsonIndent: 2 })
          }
        }

        hide()

        log({ aiResponse })

        const functionName = aiResponse?.function_call?.name
        try {
          var functionArgs = JSON.parse(aiResponse?.function_call?.arguments || '{}')
        } catch (e) {
          print.error(`🛑 Error parsing function arguments: ${e.message}`)
          print.error(`   ${aiResponse?.function_call?.arguments}`)

          const cont = options.interactive ? await prompt.confirm('Try again?') : false
          if (cont) continue

          // skip this file
          fileData.change = 'skipped'
          fileData.error = 'unknown error'
          doneWithFile = true
          continue
        }

        const fnResult = await callFunction({
          functionName,
          functionArgs,
          functions,
          aiResponse,
          sourceFileContents,
          fileData,
        })

        done(`Done with file ${localFile}.`)

        br()

        if (fnResult.doneWithFile || !options.interactive) {
          doneWithFile = true
          continue
        }

        const result = fnResult.result

        // interactive mode allows the user to undo the changes and give more instructions
        if (seeDiffs) {
          if (result.changes.split('\n').length === 0) {
            print.info(`⇾ No changes made to file.`)
          } else if (result.changes.split('\n').length <= 20) {
            print.info(result.changes + '\n')
          } else {
            print.info(`⇾ Many changes made to file -- choose "See all changes" to see them.`)
            print.info(`  Or check your code editor (probably easier)`)
          }
          br()
        }

        const keepChanges = await keepChangesMenu({ result, localFile, fileData, options })

        log({ keepChanges })

        if (keepChanges === 'next') {
          doneWithFile = true
        } else if (keepChanges === 'skip') {
          doneWithFile = true
          await result.undo()
          br()
          print.info(`↺  Changes to ${localFile} undone.`)
          fileData.change = 'skipped'
        } else if (keepChanges === 'keepExit') {
          doneWithFile = true
          userWantsToExit = true
        } else if (keepChanges === 'undoExit') {
          doneWithFile = true
          userWantsToExit = true
          await result.undo()
          br()
          print.info(`↺  Changes to ${localFile} undone.`)
          fileData.change = 'skipped'
        } else if (keepChanges === 'retry') {
          br()
          print.info('⇾ Any advice to help me convert this file better?')
          br()
          fileData.customPrompts.forEach((i) => print.info(gray(`   ${i}\n`)))

          const nextInstructions = await prompt.ask({
            type: 'input',
            name: 'nextInstructions',
            message: 'Prompt',
          })

          br()

          // typing "exit" always gets out of the CLI
          if (nextInstructions?.nextInstructions === 'exit') {
            userWantsToExit = true
            break
          }

          // undo the changes made so we can try again
          await result.undo()

          fileData.customPrompts.push(nextInstructions.nextInstructions)

          fileData.change = 'pending'

          // also remove the cache for this file
          if (options.cacheFile) {
            // load the existing cache file
            const cacheData = (await filesystem.readAsync(options.cacheFile, 'json')) || { request: {} }
            // remove the request and response to the cache file
            delete cacheData.request[localFile]
            // write it back
            await filesystem.writeAsync(options.cacheFile, cacheData, { jsonIndent: 2 })
            br()
            print.info(`↺  Cache removed for ${localFile}.`)
            br()
          }
        } else {
          br()
          print.error(`Something went wrong.`)
          log({ keepChanges })
          fileData.change = 'pending'
          fileData.error = 'something went wrong'
        }
      }

      br()

      if (userWantsToExit) break
    }

    // Print a summary of the changes
    summarize(Object.values(files), print, replacePlaceholder, br, hr)

    hr()
    print.info(bold(white(`Done!\n`)))
  },
}

module.exports = command
