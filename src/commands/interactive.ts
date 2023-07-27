import { GluegunCommand } from 'gluegun'
import { chatGPTPrompt, checkOpenAIKey } from '../ai/openai'
import { createSmartContextBackchat } from '../ai/smart-context/smartContext'
import { aiFunctions } from '../ai/functions'
import { loadSmartContext, saveSmartContext } from '../ai/smart-context/persistSmartContext'
import { loadFile } from '../utils/loadFile'
import type { Message, SmartContext } from '../types'
import { handleSpecialCommand } from '../utils/handleSpecialCommand'
import { initialPrompt, statusPrompt } from '../utils/interactiveInitialPrompt'
import { handleFunctionCall } from '../utils/handleFunctionCall'
import { listFiles } from '../utils/listFiles'
import { generateProjectSummary } from '../utils/generateProjectSummary'
import { updateCurrentTaskEmbeddings } from '../utils/updateCurrentTaskEmbeddings'
import { thinking } from '../utils/thinkingMessage'

// context holds the current state of the chat
const context: SmartContext = {
  workingFolder: process.cwd(),
  project: '',
  currentTask: '',
  currentFile: '',
  files: {},
  messages: [],
  currentTaskEmbeddings: undefined,
}

// debugLog holds everything we've done so far
const debugLog: any[] = [initialPrompt]

const command: GluegunCommand = {
  name: 'interactive',
  alias: ['i'],
  run: async (toolbox) => {
    const { print, parameters, prompt, filesystem } = toolbox
    const { colors } = print
    const { gray } = colors

    if (!checkOpenAIKey()) {
      print.info('')
      print.error(`Oops -- didn't find an OpenAI key.\n`)
      print.info(gray('Please export your OpenAI key as an environment variable.\n'))
      print.highlight('export OPENAI_API_KEY=key_goes_here\n')
      print.info('Get the key here: https://platform.openai.com/account/api-keys')
      process.exit(1)
    }

    print.highlight('\nWelcome to Flame CLI Interactive Mode!\n')
    print.info(gray('Type /help for a list of commands.\n'))

    // first parameter is the folder we want to work in
    context.workingFolder = parameters.first ? filesystem.path(parameters.first) : filesystem.cwd()

    // load/save history?
    const saveHistory = parameters.options.history !== false

    // if they don't submit --no-history, then we will load the chat history
    if (saveHistory) {
      const spinner = print.spin('Loading chat history...')
      try {
        await loadSmartContext(context)
        spinner.succeed('Chat history loaded.\n')

        print.info(`Project description: ${gray(context.project)}\n`)
        print.info(`Task: ${gray(context.currentTask)}\n`)
      } catch (error) {
        spinner.fail('Failed to load chat history.')
      }
    }

    // We need to look around and see what this project is all about
    const fileLoaderSpinner = print.spin('Looking around project...')

    // update the existing files in the working folder
    await listFiles('.', context, { recursive: true, ignore: ['.git', 'node_modules'] })

    // kick off an async loadFile for each file in the working folder
    // this will load the file contents into memory so we can search them
    // for relevant information
    await Promise.allSettled(
      Object.keys(context.files).map((fileName) => loadFile(fileName, context))
    )
    await saveSmartContext(context)
    fileLoaderSpinner.succeed(
      `All set! I just browsed through ${
        Object.keys(context.files).length
      } files. Now, we're ready to tackle anything together!\n`
    )

    // interactive loop
    while (true) {
      // let's generate a project summary if we don't have one yet
      if (!context.project) {
        const summarySpinner = print.spin('Generating project summary...')

        await generateProjectSummary(context)
        context.messages.push({ content: context.project, role: 'user' })
        context.messages.push({
          content: 'What task are you looking to do today?',
          role: 'assistant',
        })
        summarySpinner.succeed('Project summary generated.')

        print.info(``)
        print.info(`Project description: ${gray(context.project)}`)
        print.info(``)
        print.highlight(`What task are you looking to do today?`)
      }

      // show an interactive prompt
      print.info('')
      const result = await prompt.ask({ type: 'input', name: 'chatMessage', message: '→ ' })
      print.info('')

      const newMessage: Message = {
        content: result.chatMessage,
        role: 'user',
      }

      // if the prompt is "exit" or "/exit", exit the loop, we're done!
      if (['exit', '/exit'].includes(result.chatMessage)) break

      // handle other special commands
      if (await handleSpecialCommand(result.chatMessage, context, debugLog)) continue

      // if the prompt starts with "load ", load a file into the prompt
      if (result.chatMessage.startsWith('/load ')) {
        const fileName = result.chatMessage.slice(5)
        const { file } = await loadFile(fileName, context)

        if (file) {
          print.info(`Loaded ${fileName} (${file.length} characters)`)
        } else {
          print.error(`Could not find ${fileName}.`)
        }

        continue
      }

      // add the new message to the list of previous messages & debug
      context.messages.push(newMessage)
      debugLog.push(newMessage)

      // we need to update the current task embeddings so we can find the right files
      await updateCurrentTaskEmbeddings(context)

      // now let's kick off the AI loop
      for (let i = 0; i < 5; i++) {
        // age messages to avoid going over max prompt size
        // ageMessages(prevMessages, 12000)
        const backchat = await createSmartContextBackchat(context)

        const spinner = print.spin(thinking())
        const response = await chatGPTPrompt({
          functions: aiFunctions,
          messages: [initialPrompt, statusPrompt(context.workingFolder), ...backchat],
        })
        spinner.stop() // no need to show the spinner anymore

        // log the response for debugging
        debugLog.push(response)

        // print and log the response content if there is any
        if (response.content) {
          print.info(``)
          print.highlight(`${response.content}`)
          print.info(``)
        }

        // add the response to the chat log
        context.messages.push(response)

        // handle function calls
        if (!response.function_call) break // no function call, so we're done with this loop

        // if we have a function call, handle it
        const functionCallResponse = await handleFunctionCall(response, aiFunctions, context)

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
      if (saveHistory) await saveSmartContext(context)
    }
  },
}

module.exports = command
