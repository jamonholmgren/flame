import { print } from 'gluegun'
import { SessionContext } from '../../types'
import { loadFile } from './loadFile'
import { ChatCompletionFunctionMessageParam } from 'openai/resources'

export async function handleSpecialCommand(command: string, context: SessionContext) {
  // if the prompt is empty, skip it and try again
  if (command === '/project') {
    print.info(context.project)
  } else if (command === '/cwd') {
    print.info(context.cwd)
  } else if (command === '/messages') {
    print.info(context.messages)
  } else if (command.startsWith('/messages ')) {
    // if the prompt is "messages N", print the chat log last N messages
    const targetLength = parseInt(command.split(' ')[1] || '1', 10) || 10
    print.info(context.messages.slice(-targetLength))
  } else if (command === '/clear') {
    context.messages.length = 0
    print.info('Messages cleared.')
  } else if (command === '/clearlast') {
    // if the prompt is "clearlast", clear the last message
    context.messages.pop()
    print.info('Last message cleared.')
  } else if (command === '/log') {
    print.debug(context.messages)
  } else if (command === '/loglast') {
    print.debug(context.messages[context.messages.length - 1])
  } else if (command === '/help') {
    print.info(
      'Available commands:\n/context: Show the current context\n/debug: Print the previous messages\n/log: Print the chat log\n/clear: Clear the chat log\n/clearlast: Clear the last message',
    )
  } else if (command.startsWith('/load ')) {
    // if the prompt starts with "load ", load a file into the backlog
    const fileName = command.slice(6)
    const loadedFile = await loadFile(fileName)

    if (!loadedFile) {
      print.error(`Could not find ${fileName}.`)
      return true
    }

    if (!loadedFile.contents) {
      print.error(`Could not find ${fileName}.`)
      return true
    }

    // add the file to the message backlog as if it was requested by a function call
    const message: ChatCompletionFunctionMessageParam = {
      content: loadedFile.contents,
      name: 'readFileAndReportBack',
      role: 'function',
    }

    // add it as the current file (last file read)
    context.currentFile = fileName

    context.messages.push(message)

    print.info(`Loaded ${fileName} (${loadedFile.contents.length} characters)`)

    return true
  } else {
    // no special command found
    return false
  }

  // we handled it, so return true
  return true
}
