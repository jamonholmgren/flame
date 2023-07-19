import { GluegunCommand } from 'gluegun'
import { chatGPTPrompt } from '../ai/openai'
import { ChatCompletionFunctions, ChatCompletionRequestMessage } from 'openai'

type ChatCompletionFunction = ChatCompletionFunctions & {
  fn: (args: any) => Promise<{
    content?: string
    resubmit?: boolean
    error?: string
  }>
}

const prevMessages: ChatCompletionRequestMessage[] = []

const initialPrompt: ChatCompletionRequestMessage = {
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
    const aiFunctions: ChatCompletionFunction[] = [
      // Patch a file
      {
        name: 'patch',
        description: `Allows replacing or deleting the first matching string in a given file.`,
        parameters: {
          type: 'object',
          properties: {
            file: {
              type: 'string',
              description: 'The file to patch',
            },
            instructions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  replace: {
                    type: 'string',
                    description: 'Replace this string with the insert string',
                  },
                  insert: {
                    type: 'string',
                    description: 'Insert this string',
                  },
                },
              },
            },
          },
          required: ['file', 'instructions'],
        },
        fn: async (args) => {
          const { file, instructions } = args

          // ensure that the path is not any higher than the working folder
          if (filesystem.path(file).startsWith(workingFolder) === false) {
            return { error: 'Cannot update a file outside of the working folder.' }
          }

          // construct a response
          let response = `Updated ${file}:\n\n`

          for (let instruction of instructions) {
            const { insert, replace } = instruction

            const fileContents = await filesystem.readAsync(file, 'utf8')

            // Replace the string
            const patchedFileContents = fileContents.replace(replace, insert)

            // Write the file
            await filesystem.writeAsync(file, patchedFileContents)

            // Add to the response
            response += `Replaced\n\n"${replace}"\nwith\n"${insert}"\n\n`
          }

          // return the response
          return {
            content: response,
          }
        },
      },
      {
        name: 'createFile',
        description: 'Create a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path of the file to create.',
            },
            contents: {
              type: 'string',
              description: 'The contents of the file to create.',
            },
          },
        },
        fn: async (args) => {
          // ensure that the path is not any higher than the working folder
          if (filesystem.path(args.path).startsWith(workingFolder) === false) {
            return { error: 'Cannot create a file outside of the working folder.' }
          }

          // Create the file
          await filesystem.writeAsync(args.path, args.contents)

          // dry run -- just console log the instruction
          console.log(`Create file: ${args.path}\n\n${args.contents}`)

          return { content: `Created file ${args.path}` }
        },
      },
      {
        name: 'readFileAndReportBack',
        description: 'Read a file and report back with the contents',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path of the file to read.',
            },
          },
        },
        fn: async (args) => {
          // Read the file
          const contents = await filesystem.readAsync(args.path, 'utf8')

          // Return the contents
          return {
            content: `Here is the file you requested (${args.path}):\n\n` + contents,
            resubmit: true,
          }
        },
      },
      {
        name: 'listFilesAndReportBack',
        description: 'List files and subfolders in a folder and reports back with a list',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path of the folder to list the contents of.',
            },
          },
        },
        fn: async (args) => {
          // List the files
          const files = await filesystem.listAsync(args.path)

          // Return the contents
          return {
            content: `Here are the files you requested (${args.path}):\n\n` + files.join('\n'),
            resubmit: true,
          }
        },
      },
    ]

    // Helper function to handle function calls
    async function handleFunctionCall(response, functions: typeof aiFunctions) {
      const functionName = response.function_call.name
      const functionArgs = JSON.parse(response.function_call.arguments)

      // Look up function in the registry and call it with the parsed arguments
      const func = functions.find((f) => f.name === functionName)

      if (func) {
        return func.fn(functionArgs)
      } else {
        return { error: `Function '${functionName}' is not registered.` }
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
          message: '> ',
        })

        const newMessage: ChatCompletionRequestMessage = {
          content: result.chatMessage,
          role: 'user',
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

        // if the prompt starts with "load ", load a file into the prompt
        if (result.chatMessage.startsWith('load ')) {
          // TODO: have the AI figure out what file to load, and use a function call to do it

          // get the file name
          const fileName = result.chatMessage.slice(5)

          // read the file
          const fileContents = await filesystem.readAsync(`${workingFolder}/${fileName}`, 'utf8')

          // add the file contents to the prompt
          const newMessage: ChatCompletionRequestMessage = {
            content: `
  Here's the contents of ${fileName}:

  \`\`\`
  ${fileContents}
  \`\`\`
          `,
            role: 'user',
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
      print.info(prevMessages[prevMessages.length - 1].content)

      // send to ChatGPT
      const response = await chatGPTPrompt({
        functions: aiFunctions,
        messages: [initialPrompt, ...prevMessages],
      })

      // log the response for debugging
      debugLog.push(response)

      // print and log the response content
      if (response.content) {
        prevMessages.push({ content: response.content, role: 'assistant' })
      }

      // handle function calls
      if (response.function_call) {
        const functionCallResponse = await handleFunctionCall(response, aiFunctions)
        if (functionCallResponse.content) {
          print.info(functionCallResponse.content)
          prevMessages.push({ content: functionCallResponse.content, role: 'user' })
        } else if (functionCallResponse.error) {
          print.error(functionCallResponse.error)
          prevMessages.push({ content: functionCallResponse.error, role: 'user' })
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

      // run again
    }
  },
}

module.exports = command
