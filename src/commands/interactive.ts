import { GluegunCommand } from 'gluegun'
import { chatGPTPrompt } from '../ai/openai'
import { ChatCompletionFunctions, ChatCompletionRequestMessage } from 'openai'

type ChatCompletionFunction = ChatCompletionFunctions & { fn: (args: any) => void }

const prevMessages: ChatCompletionRequestMessage[] = []

const initialPrompt: ChatCompletionRequestMessage = {
  content: `
You are a bot that helps a developer build and modify software.
You understand instructions and can make the changes yourself.
The developer can also ask you questions about anything and you respond.
  `,
  role: 'system',
}

const command: GluegunCommand = {
  name: 'interactive',
  alias: ['i'],
  run: async (toolbox) => {
    const { print, parameters, prompt, filesystem } = toolbox

    // first parameter is the folder we want to work in
    const workingFolder: string = parameters.first

    // define our chatgpt functions
    const functions: ChatCompletionFunction[] = [
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
          for (let instruction of instructions) {
            const { insert, replace } = instruction

            const fileContents = await filesystem.readAsync(file, 'utf8')

            // Replace the string
            const patchedFileContents = fileContents.replace(replace, insert)

            // Write the file
            // await filesystem.writeAsync(file, patchedFileContents)
            // dry run -- just console log the instruction
            console.log(`Replace: ${file}\n\n"${replace}"\n\nwith\n\n"${insert}"`)
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
          // Create the file
          // await filesystem.writeAsync(args.path, args.contents)

          // dry run -- just console log the instruction
          console.log(`Create file: ${args.path}\n\n${args.contents}`)
        },
      },
    ]

    // interactive loop
    while (true) {
      // show an interactive prompt
      const result = await prompt.ask({
        type: 'input',
        name: 'chatMessage',
        message: '> ',
      })

      // if the prompt is empty, skip it
      if (result.chatMessage === '') continue

      // if the prompt is "exit", exit the loop
      if (result.chatMessage === 'exit') break

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

      const newMessage: ChatCompletionRequestMessage = { content: result.chatMessage, role: 'user' }

      // send to ChatGPT
      const response = await chatGPTPrompt({
        functions,
        messages: [initialPrompt, ...prevMessages, newMessage],
      })

      // print the response
      print.info(response)

      // add the new message to the list of previous messages
      prevMessages.push(newMessage)

      // add the response to the list of previous messages
      prevMessages.push({ content: response.content, role: 'assistant' })

      // run again
    }
  },
}

module.exports = command
