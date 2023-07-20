import { GluegunCommand } from 'gluegun'
import { chatGPTPrompt } from '../ai/openai'
import { ageMessages } from '../utils/ageMessages'
import { aiFunctions } from '../ai/functions'
import { loadChatHistory, saveChatHistory } from '../utils/chatHistory'
import { loadFile } from '../utils/loadFile'
import type { Message } from '../types'

let prevMessages: Message[] = []

const initialPrompt: Message = {
  content: `
You are a bot that helps a developer build and modify software.
You understand instructions and can make the changes yourself.
The developer can also ask you questions about anything and you respond.
Before making changes to a file, if the file has not yet been read
into the chat backlog, then you can read the file first and we will
report back with the contents of that file so you can figure out
where to make changes.
  `,
  role: 'system',
}

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

    // Helper function to handle function calls
    async function handleFunctionCall(response, functions: typeof aiFunctions) {
      const functionName = response.function_call.name
      const functionArgs = JSON.parse(response.function_call.arguments)

      // Look up function in the registry and call it with the parsed arguments
      const func = functions.find((f) => f.name === functionName)

      if (func) {
        return func.fn({ workingFolder, ...functionArgs })
      } else {
        return { error: `Function '${functionName}' is not registered.` }
      }
    }

    // if they don't submit --no-history, then we will load the chat history
    if (saveHistory) prevMessages = await loadChatHistory(workingFolder)

    // interactive loop
    while (true) {
      // show an interactive prompt if not resubmitting
      print.info('')
      const result = await prompt.ask({
        type: 'input',
        name: 'chatMessage',
        message: '→ ',
      })

      print.info('')

      let newMessage: Message = {
        content: result.chatMessage,
        role: 'user',
        age: 100,
      }

      // if the prompt is empty, skip it and try again
      if (result.chatMessage.trim() === '') continue

      // if the prompt is "exit", exit the loop
      if (result.chatMessage === 'exit') {
        await saveChatHistory(workingFolder, prevMessages)
        break
      }

      // if the prompt is "debug", print the previous messages
      if (result.chatMessage === 'debug') {
        print.info(debugLog)
        continue
      }

      // if the prompt is "log", print the chat log
      if (result.chatMessage === 'log') {
        print.info(prevMessages)
        continue
      }

      // if the prompt is "clear", clear the chat log
      if (result.chatMessage === 'clear') {
        prevMessages.length = 0
        print.info('Chat log cleared.')
        continue
      }

      // if the prompt is "clearlast", clear the last message
      if (result.chatMessage === 'clearlast') {
        prevMessages.pop()
        print.info('Last message cleared.')
        continue
      }

      // if the prompt starts with "load ", load a file into the prompt
      if (result.chatMessage.startsWith('load ')) {
        const fileName = result.chatMessage.slice(5)
        const { message, fileContents } = await loadFile(fileName, workingFolder)
        newMessage = message

        // print that we loaded it
        print.info(`Loaded ${fileName} (${fileContents.length} characters)`)
      }

      // add the new message to the list of previous messages & debug
      prevMessages.push(newMessage)
      debugLog.push(newMessage)

      // now let's kick off the AI loop
      for (let i = 0; i < 5; i++) {
        // age messages to avoid going over max prompt size
        ageMessages(prevMessages, 12000)

        // remove the age property for sending to ChatGPT
        let strippedMessages = prevMessages.map(({ age, ...restOfMessage }) => restOfMessage)

        // status -- time, date, working folder
        const statusPrompt: Message = {
          content: `Current date: ${new Date().toLocaleString()}\nCurrent folder: ${workingFolder}`,
          role: 'system',
        }

        // send to ChatGPT
        const response = await chatGPTPrompt({
          functions: aiFunctions,
          messages: [initialPrompt, statusPrompt, ...strippedMessages],
        })

        // log the response for debugging
        debugLog.push(response)

        // print and log the response content if there is any
        if (response.content) {
          print.info(``)
          print.info(`${response.content}`)
          prevMessages.push({ content: response.content, role: 'assistant', age: 10 })
        }

        // handle function calls
        if (!response.function_call) break // no function call, so we're done with this loop

        // if we have a function call, handle it
        const functionCallResponse = await handleFunctionCall(response, aiFunctions)
        debugLog.push(functionCallResponse)

        // if we have an error, print it and stop
        if (functionCallResponse.error) {
          print.error(functionCallResponse.error)
          prevMessages.push({ content: functionCallResponse.error, role: 'user', age: 5 })
          break
        }

        // add the response to the chat log
        if (functionCallResponse.content) {
          prevMessages.push({ content: functionCallResponse.content, role: 'user', age: 5 })
        }

        // if we don't have a resubmit, we're done with this loop
        if (!functionCallResponse.resubmit) break
      }

      // persist the chat history
      if (saveHistory) await saveChatHistory(workingFolder, prevMessages)

      // run again
    }
  },
}

module.exports = command
