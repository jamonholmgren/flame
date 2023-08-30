import { filesystem, prompt, print } from 'gluegun'
import type { FileData } from '../utils/parseGitDiff'
import { hide, spin, stop, done } from '../utils/spin'
import { br } from '../utils/out'
import { coloredDiff } from '../utils/coloredDiff'
import { createUpgradeRNPrompts } from '../ai/prompts/upgradeReactNativePrompts'
import { ChatCompletionFunction } from '../types'
import { patch } from '../ai/functions/patch'
import { createFile } from '../ai/functions/createFile'
import { deleteFile } from '../ai/functions/deleteFile'
import { ChatCompletionRequestMessage, ChatCompletionResponseMessage } from 'openai'
import { chatGPTPrompt } from '../ai/openai'
import { callFunction } from '../interactive/callFunction'
import { keepChangesMenu } from '../interactive/keepChangesMenu'

export async function upgradeFile({
  fileData,
  options,
  currentVersion,
  targetVersion,
}: {
  fileData: FileData
  options: any
  currentVersion: string
  targetVersion: string
}) {
  const { bold, white, gray } = print.colors
  const log = (t: any) => options.debug && console.log(t)

  const seeDiffs = options.diffs !== false

  // load the file from the filesystem
  const sourceFileContents = await filesystem.readAsync(fileData.path)

  // if the file doesn't exist, skip it
  if (!sourceFileContents) {
    // stop('🙈', `Couldn't find ${fileData.path}, skipping`)
    print.info(`↠ Skipping: ${fileData.path} (file not found)`)
    br()
    fileData.change = 'skipped'
    fileData.error = 'file not found'
    return { userWantsToExit: false }
  }

  // stop the spinner temporarily to ask the user a question
  hide()
  print.info(`${bold('■ File: ')} ${fileData.path}`)
  br()

  // check if the user wants to convert the next file or skip this file
  let skipFile = 'upgrade'
  if (options.interactive) {
    if (seeDiffs) print.info(white('Upgrade Helper diff:\n\n') + coloredDiff(fileData.diff) + '\n')

    const skipAnswer = await prompt.ask({
      type: 'select',
      name: 'skipFile',
      message: 'Do you want to upgrade this file?',
      choices: [
        { message: `Start upgrading ${fileData.path}`, name: 'upgrade' },
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
    return { userWantsToExit: false }
  } else if (skipFile === 'exit') {
    return { userWantsToExit: true }
  } // else, we're good!

  const { orientation, convertPrompt, admonishments } = createUpgradeRNPrompts({
    from: currentVersion,
    to: targetVersion,
    file: fileData.path,
    contents: sourceFileContents,
    diff: fileData.diff,
  })

  let doneWithFile = false
  while (!doneWithFile) {
    // Restart the spinner for the current file
    spin(`Upgrading ${fileData.path}`)

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
      if (cacheData?.request[fileData.path]) {
        aiResponse = cacheData.request[fileData.path]
      }
    }

    if (aiResponse) {
      // delay briefly to simulate a real request
      await new Promise((resolve) => setTimeout(resolve, 2500))
      stop('🔥', `Using cached response for ${fileData.path}`)
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
        cacheData.request[fileData.path] = aiResponse

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
      return { userWantsToExit: false }
    }

    const fnResult = await callFunction({
      functionName,
      functionArgs,
      functions,
      aiResponse,
      fileData,
    })

    done(`Upgraded file ${fileData.path}.`)

    br()

    if (fnResult.doneWithFile || !options.interactive) {
      return { userWantsToExit: false }
    }

    const result = fnResult.result

    // interactive mode allows the user to undo the changes and give more instructions
    if (seeDiffs) {
      if (result.changes.split('\n').length === 0) {
        print.info(`⇾ No changes made to file.\n`)
      } else if (result.changes.split('\n').length <= 20) {
        print.info(result.changes + '\n')
      } else {
        print.info(`⇾ Many changes made to file -- choose "See all changes" to see them.`)
        print.info(`  Or check your code editor (probably easier)\n`)
      }
      br()
    }

    const keepChanges = await keepChangesMenu({ result, fileData, options })

    log({ keepChanges })

    if (keepChanges === 'next') {
      doneWithFile = true
    } else if (keepChanges === 'skip') {
      doneWithFile = true
      await result.undo()
      br()
      print.info(`↺  Changes to ${fileData.path} undone.`)
      fileData.change = 'skipped'
    } else if (keepChanges === 'keepExit') {
      return { userWantsToExit: true }
    } else if (keepChanges === 'undoExit') {
      await result.undo()
      br()
      print.info(`↺  Changes to ${fileData.path} undone.`)
      fileData.change = 'skipped'
      return { userWantsToExit: true }
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
        return { userWantsToExit: true }
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
        delete cacheData.request[fileData.path]
        // write it back
        await filesystem.writeAsync(options.cacheFile, cacheData, { jsonIndent: 2 })
        br()
        print.info(`↺  Cache removed for ${fileData.path}.`)
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
}
