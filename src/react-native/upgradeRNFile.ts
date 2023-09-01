import type { FileData } from '../types'
import type { CLIOptions, ChatCompletionFunction } from '../types'
import type { ChatCompletionRequestMessage } from 'openai'
import { filesystem, prompt, print } from 'gluegun'
import { hide, spin, stop, done } from '../utils/spin'
import { br } from '../utils/printing'
import { createUpgradeRNPrompts } from '../prompts/upgradeReactNativePrompts'
import { patch } from '../ai/openai/functions/patch'
import { createFile } from '../ai/openai/functions/createFile'
import { deleteFile } from '../ai/openai/functions/deleteFile'
import { chatGPTPrompt } from '../ai/openai/openai'
import { callFunction } from '../utils/callFunction'
import { deleteCachedResponse, loadCachedResponse, saveCachedResponse } from '../utils/persistCache'
import { checkAIResponseForError } from '../utils/checkAIResponseForError'
import { retryGetAdvice } from '../utils/retryGetAdvice'
import { coloredDiff } from '../utils/coloredDiff'
import { menuKeepChanges } from '../utils/menuKeepChanges'
import { menuSkipOrUpgrade } from '../utils/menuSkipOrUpgrade'

type UpgradeFileOptions = {
  fileData: FileData
  options: CLIOptions
  currentVersion: string
  targetVersion: string
}

export async function upgradeFile({ fileData, options, currentVersion, targetVersion }: UpgradeFileOptions) {
  const { bold, white } = print.colors
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
  print.info(white('Upgrade Helper diff:\n\n') + coloredDiff(fileData.diff) + '\n')
  const suMenu = options.interactive ? await menuSkipOrUpgrade(fileData) : { next: 'upgrade' }
  if (suMenu?.next === 'skip') return { userWantsToExit: false }
  if (suMenu?.next === 'exit') return { userWantsToExit: true }

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

    let aiResponse = options.cacheFile ? await loadCachedResponse(options.cacheFile, fileData.path) : undefined

    if (aiResponse) {
      // delay briefly to simulate a real request
      await new Promise((resolve) => setTimeout(resolve, 2500))
      stop('🔥', `Using cached response for ${fileData.path}`)
    } else {
      aiResponse = await chatGPTPrompt({ functions, messages, model: 'gpt-4' })

      // check for too_many_requests, context_length_exceeded, etc
      const errorResult = await checkAIResponseForError({ aiResponse, sourceFileContents, fileData })
      if (errorResult.next === 'retry') continue
      if (errorResult.next === 'skip') return { userWantsToExit: false }

      if (options.cacheFile) await saveCachedResponse(options.cacheFile, fileData.path, aiResponse)
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
    const keepChanges = await menuKeepChanges({ result, fileData, options })

    log({ keepChanges })

    if (keepChanges === 'next') return { userWantsToExit: false }
    if (keepChanges === 'keepExit') return { userWantsToExit: true }

    if (keepChanges === 'skip' || keepChanges === 'undoExit') {
      await result.undo()
      br()
      print.info(`↺  Changes to ${fileData.path} undone.`)
      fileData.change = 'skipped'
      const userWantsToExit = keepChanges === 'undoExit'
      return { userWantsToExit }
    }

    if (keepChanges === 'retry') {
      await retryGetAdvice(fileData)
      await result.undo()
      if (options.cacheFile) await deleteCachedResponse(options.cacheFile, fileData.path)
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
