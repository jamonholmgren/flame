import type { FileData } from '../utils/parseGitDiff'
import type { CLIOptions, ChatCompletionFunction } from '../types'
import type { ChatCompletionRequestMessage, ChatCompletionResponseMessage } from 'openai'
import { filesystem, prompt, print } from 'gluegun'
import { hide, spin, stop, done } from '../utils/spin'
import { br } from '../utils/out'
import { coloredDiff } from '../utils/coloredDiff'
import { createUpgradeRNPrompts } from '../ai/prompts/upgradeReactNativePrompts'
import { patch } from '../ai/functions/patch'
import { createFile } from '../ai/functions/createFile'
import { deleteFile } from '../ai/functions/deleteFile'
import { chatGPTPrompt } from '../ai/openai'
import { callFunction } from '../interactive/callFunction'
import { keepChangesMenu } from '../interactive/keepChangesMenu'
import { deleteCachedResponse, loadCachedResponse, saveCachedResponse } from '../utils/aiCache'

type UpgradeFileOptions = {
  fileData: FileData
  options: CLIOptions
  currentVersion: string
  targetVersion: string
}

export async function upgradeFile({ fileData, options, currentVersion, targetVersion }: UpgradeFileOptions) {
  const { bold, white, gray } = print.colors
  const log = (t: any) => options.debug && console.log(t)

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
    print.info(white('Upgrade Helper diff:\n\n') + coloredDiff(fileData.diff) + '\n')

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

  while (true) {
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

    let aiResponse = options.cacheFile ? await loadCachedResponse(options.cacheFile, fileData) : undefined

    if (aiResponse) {
      // delay briefly to simulate a real request
      await new Promise((resolve) => setTimeout(resolve, 2500))
      stop('🔥', `Using cached response for ${fileData.path}`)
    } else {
      aiResponse = await chatGPTPrompt({ functions, messages, model: 'gpt-4' })

      if (options.cacheFile) await saveCachedResponse(options.cacheFile, fileData, aiResponse)
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

    const fnResult = await callFunction({ functionName, functionArgs, functions, aiResponse, fileData })

    done(`Upgraded file ${fileData.path}.`)

    br()

    if (fnResult.doneWithFile || !options.interactive) return { userWantsToExit: false }

    const result = fnResult.result

    // interactive mode allows the user to undo the changes and give more instructions
    if (result.changes.split('\n').length === 0) {
      print.info(`⇾ No changes made to file.\n`)
    } else if (result.changes.split('\n').length <= 20) {
      print.info(result.changes + '\n')
    } else {
      print.info(`⇾ Many changes made to file -- choose "See all changes" to see them.`)
      print.info(`  Or check your code editor (probably easier)\n`)
    }
    br()

    const keepChanges = await keepChangesMenu({ result, fileData, options })

    log({ keepChanges })

    if (keepChanges === 'next') return { userWantsToExit: false }
    if (keepChanges === 'skip') {
      await result.undo()
      br()
      print.info(`↺  Changes to ${fileData.path} undone.`)
      fileData.change = 'skipped'
      return { userWantsToExit: false }
    }
    if (keepChanges === 'keepExit') return { userWantsToExit: true }

    if (keepChanges === 'undoExit') {
      await result.undo()
      br()
      print.info(`↺  Changes to ${fileData.path} undone.`)
      fileData.change = 'skipped'
      return { userWantsToExit: true }
    }

    if (keepChanges === 'retry') {
      br()
      print.info('⇾ Any advice to help me convert this file better?')
      br()

      fileData.customPrompts.forEach((i) => print.info(gray(`   ${i}\n`)))

      const nextInstructionsQuestion = await prompt.ask({ type: 'input', name: 'nextInstructions', message: 'Prompt' })
      const nextInstructions = nextInstructionsQuestion.nextInstructions

      br()

      // typing "exit" always gets out of the CLI
      if (nextInstructions === 'exit') return { userWantsToExit: true }

      // undo the changes made so we can try again
      await result.undo()

      fileData.customPrompts.push(nextInstructions)
      fileData.change = 'pending'

      if (options.cacheFile) await deleteCachedResponse(options.cacheFile, fileData)
    } else {
      // This really should never happen
      br()
      print.error(`Something went wrong. keepChanges: ${keepChanges}`)
      log({ keepChanges })
      fileData.change = 'pending'
      fileData.error = 'something went wrong'
    }
  }
}
