import { GluegunCommand } from 'gluegun'
import { chatGPTPrompt } from '../ai/openai'
import { ageMessages } from '../utils/ageMessages'
import { aiFunctions } from '../ai/functions'
import { loadChatHistory, saveChatHistory } from '../utils/chatHistory'
import { loadFile } from '../utils/loadFile'
import type { Message } from '../types'
import { handleSpecialCommand } from '../utils/handleSpecialCommand'
import { initialPrompt, statusPrompt } from '../utils/interactiveInitialPrompt'
import { handleFunctionCall } from '../utils/handleFunctionCall'
import { listFiles } from '../utils/listFiles'

let prevMessages: Message[] = []

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
    if (saveHistory) prevMessages = await loadChatHistory(workingFolder)

    // interactive loop
    while (true) {
      // show an interactive prompt if not resubmitting
      print.info('')
      const result = await prompt.ask({ type: 'input', name: 'chatMessage', message: '→ ' })
      print.info('')

      const newMessage: Message = {
        content: result.chatMessage,
        role: 'user',
        age: 100,
        importance: result.chatMessage.toLowerCase().startsWith('important:')
          ? 'important'
          : 'normal',
      }

      // if the prompt is "exit", exit the loop
      if (result.chatMessage === 'exit') break

      // handle other special commands
      if (handleSpecialCommand(result.chatMessage, prevMessages, debugLog)) continue

      // if the prompt starts with "load ", load a file into the prompt
      if (result.chatMessage.startsWith('load ')) {
        const fileName = result.chatMessage.slice(5)
        const { message, fileContents } = await loadFile(fileName, workingFolder)
        prevMessages.push(message)

        // print that we loaded it
        print.info(`Loaded ${fileName} (${fileContents.length} characters)`)
        continue
      }

      // if the prompt starts with "ls ", list files in the prompt
      if (result.chatMessage.startsWith('ls ')) {
        const path = filesystem.path(result.chatMessage.slice(3))
        const { message } = await listFiles(path)
        prevMessages.push(message)

        // print that we loaded it
        print.info(`Listed ${path}`)
        continue
      }

      // add the new message to the list of previous messages & debug
      prevMessages.push(newMessage)
      debugLog.push(newMessage)

      // now let's kick off the AI loop
      for (let i = 0; i < 5; i++) {
        // age messages to avoid going over max prompt size
        ageMessages(prevMessages, 12000)

        // remove the age property for sending to ChatGPT
        let strippedMessages = prevMessages.map(
          ({ age, importance, ...restOfMessage }) => restOfMessage
        )

        // send to ChatGPT
        const response = await chatGPTPrompt({
          functions: aiFunctions,
          messages: [initialPrompt, statusPrompt(workingFolder), ...strippedMessages],
        })

        // log the response for debugging
        debugLog.push(response)

        // print and log the response content if there is any
        if (response.content) {
          print.info(``)
          print.info(`${response.content}`)
        }

        // add the response to the chat log
        prevMessages.push({ ...response, age: 10 })

        // handle function calls
        if (!response.function_call) break // no function call, so we're done with this loop

        // if we have a function call, handle it
        const functionCallResponse = await handleFunctionCall(response, aiFunctions, workingFolder)
        debugLog.push(functionCallResponse)

        // if we have an error, print it and stop
        if (functionCallResponse.error) {
          print.error(functionCallResponse.error)
          prevMessages.push({
            content: 'Error: ' + functionCallResponse.error,
            role: 'function',
            name: response.function_call.name,
            age: 5,
          })
          break
        }

        // add the response to the chat log
        if (functionCallResponse.content) {
          prevMessages.push({
            content: functionCallResponse.content,
            role: 'function',
            name: response.function_call.name,
            age: 5,
            importance: 'normal',
          })
        }

        // if we don't have a resubmit, we're done with this loop
        if (!functionCallResponse.resubmit) break
      }

      // persist the chat history
      if (saveHistory) await saveChatHistory(workingFolder, prevMessages)
    }
  },
}

module.exports = command
