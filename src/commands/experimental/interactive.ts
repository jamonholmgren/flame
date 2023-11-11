import type { MessageParam, SessionContext } from '../../types'
import type { GluegunCommand } from 'gluegun'
import { chatGPTPrompt, checkOpenAIKey } from '../../ai/openai/openai'
import { loadContext, saveContext } from '../../utils/experimental/persistContext'
import { handleSpecialCommand } from '../../utils/experimental/handleSpecialCommand'
import { initialPrompt, statusPrompt } from '../../prompts/interactiveInitialPrompt'
import { handleToolCalls } from '../../utils/experimental/handleToolCalls'
import { listFiles } from '../../utils/experimental/listFiles'
import { generateProjectSummary } from '../../utils/experimental/generateProjectSummary'
import { thinking } from '../../utils/experimental/thinkingMessage'
import { patch } from '../../ai/openai/functions/patch'
import { readFile } from '../../ai/openai/functions/readFile'
import { deleteFile } from '../../ai/openai/functions/deleteFile'
import { createFile } from '../../ai/openai/functions/createFile'
import { ChatCompletionFunctionMessageParam, ChatCompletionSystemMessageParam } from 'openai/resources'
import { messagesUpToMaximumTokenSize } from '../../utils/messagesUpToMaximumTokenSize'

// context holds the current state of the chat
const context: SessionContext = {
  cwd: process.cwd(),
  project: '',
  currentFile: '',
  files: [],
  messages: [],
}

const MAXIMUM_PROMPT_SIZE = 90 * 1024 // limit to 90k tokens for now

const command: GluegunCommand = {
  name: 'interactive',
  alias: ['i'],
  run: async (toolbox) => {
    const { print, parameters, prompt, filesystem } = toolbox
    const { colors } = print
    const { gray } = colors

    checkOpenAIKey()

    print.highlight('\nWelcome to Flame CLI Interactive Mode!\n')
    print.info(gray('Type /help for a list of commands.\n'))

    // load/save history?
    const saveHistory = parameters.options.history !== false

    // if they don't submit --no-history, then we will load the chat history
    if (saveHistory) {
      const spinner = print.spin('Loading chat history...')
      try {
        await loadContext(context)
        spinner.succeed('Chat history loaded.\n')

        print.info(`Project description: ${gray(context.project)}\n`)
      } catch (error) {
        spinner.fail('Failed to load chat history.')
      }
    }

    // We need to look around and see what this project is all about
    const fileLoaderSpinner = print.spin('Looking around project...')

    // update the existing files in the working folder
    context.files = await listFiles('.', { recursive: true })

    await saveContext(context)

    fileLoaderSpinner.succeed(
      `All set! I just browsed through ${context.files.length} files. Now, we're ready to tackle anything together!\n`,
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

      // Entered nothing of significance, just try again
      if (!result.chatMessage || !result.chatMessage.trim()) continue

      const newMessage: MessageParam = { content: result.chatMessage, role: 'user' }

      // if the prompt is "exit" or "/exit", exit the loop, we're done!
      if (result.chatMessage === 'exit') break
      if (result.chatMessage.startsWith('/exit')) break

      // handle other special commands
      if (await handleSpecialCommand(result.chatMessage, context)) continue

      // add the new message to the list of previous messages & debug
      context.messages.push(newMessage)

      // now let's kick off the AI loop
      for (let i = 0; i < 5; i++) {
        // get previous messages, but only up to the maximum token size
        const backchat = messagesUpToMaximumTokenSize(context.messages, MAXIMUM_PROMPT_SIZE)

        const filesPrompt: ChatCompletionSystemMessageParam = {
          role: 'system',
          content: `Here are all the files in the project:\n\n${context.files.join('\n')}\nThe last accessed file was ${
            context.currentFile || '(none yet)'
          }.`,
        }

        const aiFunctions = [patch, readFile, deleteFile, createFile]

        const spinner = print.spin(thinking())
        const message = await chatGPTPrompt({
          functions: aiFunctions,
          messages: [initialPrompt, filesPrompt, statusPrompt(context.cwd), ...backchat],
        })
        spinner.stop()

        // print and log the response content if there is any
        if (message.content) {
          print.info(``)
          print.highlight(`${message.content}`)
          print.info(``)
        }

        // add the response to the chat log
        context.messages.push(message)

        // handle tool calls
        if (!message.tool_calls && !message.function_call) break // no function call, so we're done with this loop

        // if we have toolcalls or a function call, handle it
        const toolCallResults = await handleToolCalls(message, aiFunctions, context)

        // now see if any of the toolcalls want to resubmit to the AI
        let resubmit = false
        toolCallResults.forEach((result) => {
          // if the tool call gave us some content to return to the AI, add it to the chat log
          if (result.content) {
            const toolCallResponse: ChatCompletionFunctionMessageParam = {
              name: result.name,
              content: result.content,
              role: 'function',
            }
            context.messages.push(toolCallResponse)
          }
          if (result.next === 'resubmit') resubmit = true
        })
        if (!resubmit) break
      }

      // persist the chat history
      if (saveHistory) await saveContext(context)
    }
  },
}

module.exports = command
