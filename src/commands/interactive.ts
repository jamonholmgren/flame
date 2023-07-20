import { GluegunCommand } from 'gluegun'
import { chatGPTPrompt } from '../ai/openai'
import { smartContext } from '../ai/smart-context/smartContext'
import { aiFunctions } from '../ai/functions'
import { loadChatHistory, saveChatHistory } from '../ai/smart-context/smartContextHistory'
import { loadFile } from '../utils/loadFile'
import type { Message, SmartContext } from '../types'
import { handleSpecialCommand } from '../utils/handleSpecialCommand'
import { initialPrompt, statusPrompt } from '../utils/interactiveInitialPrompt'
import { handleFunctionCall } from '../utils/handleFunctionCall'
import { listFiles } from '../utils/listFiles'

// context holds the current state of the chat
const context: SmartContext = {
  tasks: [],
  files: [],
  messages: [],
}

// debugLog holds everything we've done so far
const debugLog: any[] = [initialPrompt]

const command: GluegunCommand = {
  name: 'interactive',
  alias: ['i'],
  run: async (toolbox) => {
    const { print, parameters, prompt, filesystem } = toolbox

    // first parameter is the folder we want to work in
    const workingFolder: string = filesystem.path(parameters.first)

    // load/save history?
    const saveHistory = parameters.options.history !== false

    // if they don't submit --no-history, then we will load the chat history
    if (saveHistory) {
      const spinner = print.spin('Loading chat history...')
      try {
        const newContext = await loadChatHistory(workingFolder)

        context.tasks = newContext.tasks
        context.files = newContext.files
        context.messages = newContext.messages

        spinner.succeed('Chat history loaded.')
      } catch (error) {
        spinner.fail('Failed to load chat history.')
      }
    }

    // interactive loop
    while (true) {
      // show an interactive prompt if not resubmitting
      print.info('')
      const result = await prompt.ask({ type: 'input', name: 'chatMessage', message: '→ ' })
      print.info('')

      const newMessage: Message = {
        content: result.chatMessage,
        role: 'user',
      }

      // if the prompt is "exit", exit the loop
      if (result.chatMessage === 'exit') break

      // handle other special commands
      if (handleSpecialCommand(result.chatMessage, context.messages, debugLog)) continue

      // if the prompt starts with "load ", load a file into the prompt
      if (result.chatMessage.startsWith('load ')) {
        const fileName = result.chatMessage.slice(5)
        const { message, fileContents } = await loadFile(fileName, workingFolder)
        context.messages.push(message)

        // print that we loaded it
        print.info(`Loaded ${fileName} (${fileContents.length} characters)`)
        continue
      }

      // if the prompt starts with "ls ", list files in the prompt
      if (result.chatMessage.startsWith('ls ')) {
        const path = filesystem.path(result.chatMessage.slice(3))
        const spinner = print.spin(`Listing ${path}...`)
        const { message } = await listFiles(path)
        spinner.succeed(`Listed ${path}.`)
        context.messages.push(message)

        // print that we loaded it
        print.info(`Listed ${path}`)
        continue
      }

      // add the new message to the list of previous messages & debug
      context.messages.push(newMessage)
      debugLog.push(newMessage)

      // now let's kick off the AI loop
      for (let i = 0; i < 5; i++) {
        // age messages to avoid going over max prompt size
        // ageMessages(prevMessages, 12000)
        const smartMessages = smartContext(context)

        // send to ChatGPT
        const spinner = print.spin('AI is thinking...')
        const response = await chatGPTPrompt({
          functions: aiFunctions,
          messages: [initialPrompt, statusPrompt(workingFolder), ...smartMessages],
        })
        spinner.stop() // no need to show the spinner anymore

        // log the response for debugging
        debugLog.push(response)

        // print and log the response content if there is any
        if (response.content) {
          print.info(``)
          print.info(`${response.content}`)
          print.info(``)
        }

        // add the response to the chat log
        context.messages.push(response)

        // handle function calls
        if (!response.function_call) break // no function call, so we're done with this loop

        // if we have a function call, handle it
        const fnSpinner = print.spin(`Running ${response.function_call.name}...`)
        const functionCallResponse = await handleFunctionCall(response, aiFunctions, workingFolder)
        fnSpinner.succeed(`${response.function_call.name} complete.`)
        debugLog.push(functionCallResponse)

        // if we have an error, print it and stop
        if (functionCallResponse.error) {
          print.error(functionCallResponse.error)
          context.messages.push({
            content: 'Error: ' + functionCallResponse.error,
            role: 'function',
            name: response.function_call.name,
          })
          break
        }

        // add the response to the chat log
        if (functionCallResponse.content) {
          context.messages.push({
            content: functionCallResponse.content,
            role: 'function',
            name: response.function_call.name,
          })
        }

        // if we don't have a resubmit, we're done with this loop
        if (!functionCallResponse.resubmit) break
      }

      // persist the chat history
      if (saveHistory) await saveChatHistory(workingFolder, context)
    }
  },
}

module.exports = command
