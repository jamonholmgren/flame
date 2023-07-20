import { GluegunCommand } from 'gluegun'
import { chatGPTPrompt } from '../ai/openai'
import { ChatCompletionFunctions, ChatCompletionRequestMessage } from 'openai'
import { ageMessages } from '../utils/ageMessages'

type ChatCompletionFunction = ChatCompletionFunctions & {
  fn: (args: any) => Promise<{
    content?: string
    resubmit?: boolean
    error?: string
  }>
}

type Message = ChatCompletionRequestMessage & {
  age?: number
}

const prevMessages: Message[] = []

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

    // define our chatgpt functions
    const aiFunctions: ChatCompletionFunction[] = require('../ai/functions')

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
    const chatHistoryFile = `${workingFolder}/.config/flame/flame-history.json`
    if (parameters.options.history !== false) {
      // make sure the folder exists
      await filesystem.dirAsync(`${workingFolder}/.config/flame`)
      // read the chat history
      const chatHistory = await filesystem.readAsync(chatHistoryFile, 'utf8')
      // if there is chat history, parse it
      if (chatHistory) {
        const parsedChatHistory = JSON.parse(chatHistory)
        // add the chat history to the previous messages
        prevMessages.push(...parsedChatHistory)
      }
    }

    // resubmit counter to ensure that we don't get stuck in a loop
    let resubmitCounter: undefined | number = undefined

    // interactive loop
    while (true) {
      if (resubmitCounter) {
        // no need to add another message, just submit what we have again
      } else {
        // show an interactive prompt if not resubmitting
        const result = await prompt.ask({
          type: 'input',
          name: 'chatMessage',
          message: '→ ',
        })

        print.info('')

        const newMessage: Message = {
          content: result.chatMessage,
          role: 'user',
          age: 100,
        }

        // if the prompt is empty, skip it
        if (result.chatMessage === '') continue

        // if the prompt is "exit", exit the loop
        if (result.chatMessage === 'exit') break

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
          // TODO: have the AI figure out what file to load, and use a function call to do it

          // get the file name
          const fileName = result.chatMessage.slice(5)

          // read the file
          const fileContents = await filesystem.readAsync(`${workingFolder}/${fileName}`, 'utf8')

          // add the file contents to the prompt
          const newMessage: Message = {
            content: `
  Here's the contents of ${fileName}:

  \`\`\`
  ${fileContents}
  \`\`\`
          `,
            role: 'user',
            age: 5,
          }

          // add the new message to the list of previous messages
          prevMessages.push(newMessage)

          // print that we loaded it
          print.info(`Loaded ${fileName} (${fileContents.length} characters)`)

          // run again
          continue
        }

        // add the new message to the list of previous messages
        prevMessages.push(newMessage)

        // add the message for debugging
        debugLog.push(newMessage)
      }

      // log the last message
      // print.info(prevMessages[prevMessages.length - 1].content)

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

      // print and log the response content
      if (response.content) {
        print.info(``)
        print.info(`${response.content}`)
        prevMessages.push({ content: response.content, role: 'assistant', age: 10 })
      }

      // handle function calls
      if (response.function_call) {
        const functionCallResponse = await handleFunctionCall(response, aiFunctions)
        if (functionCallResponse.content) {
          // print.info(functionCallResponse.content)
          prevMessages.push({ content: functionCallResponse.content, role: 'user', age: 5 })
        } else if (functionCallResponse.error) {
          print.error(functionCallResponse.error)
          prevMessages.push({ content: functionCallResponse.error, role: 'user', age: 5 })
        }
        debugLog.push(functionCallResponse)

        if (functionCallResponse.resubmit) {
          // increment the resubmit counter
          resubmitCounter = resubmitCounter ? resubmitCounter + 1 : 1

          // if we've resubmitted too many times, stop that
          if (resubmitCounter > 5) {
            print.error('Too many resubmits.')
            resubmitCounter = undefined
          }
        } else {
          resubmitCounter = undefined
        }
      } else {
        resubmitCounter = undefined
      }

      // age messages to avoid going over prompt size
      ageMessages(prevMessages)

      // persist the chat history
      if (parameters.options.history !== false) {
        await filesystem.writeAsync(chatHistoryFile, JSON.stringify(prevMessages))
      }

      // run again
    }
  },
}

module.exports = command
