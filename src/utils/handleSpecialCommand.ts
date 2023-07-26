import { print } from 'gluegun'
import { SmartContext } from '../types'
import { createSmartContextBackchat } from '../ai/smart-context/smartContext'

export async function handleSpecialCommand(
  command: string,
  context: SmartContext,
  debugLog: any[]
) {
  // if the prompt is empty, skip it and try again
  if (command.trim() === '') return true

  // if the prompt is "debug", print the previous messages
  if (command === '/debug') {
    print.info(debugLog)
    return true
  }

  // context
  if (command.startsWith('/context.') || command === 'context') {
    if (command === '/context.project') {
      print.info(context.project)
    } else if (command === '/context.task') {
      print.info(context.currentTask)
    } else if (command === '/context.files') {
      print.info(context.files)
    } else if (command === '/context.messages') {
      print.info(context.messages)
    } else if (command === '/context.workingFolder') {
      print.info(context.workingFolder)
    } else if (command === '/context.clear') {
      Object.assign(context, {
        project: '',
        currentTask: '',
        currentFile: '',
        files: {},
        messages: [],
      })
    } else if (command === '/context.smart') {
      print.info(await createSmartContextBackchat(context))
    } else if (command === '/context') {
      print.info(context)
    }
    return true
  }

  // if the prompt is "log", print the chat log
  if (command === '/log') {
    print.info(context.messages)
    return true
  }

  // if the prompt is "log N", print the chat log last N messages
  if (command.startsWith('/log ')) {
    const targetLength = parseInt(command.split(' ')[1], 10) || 10
    print.info(context.messages.slice(-targetLength))
    return true
  }

  // if the prompt is "clear", clear the chat log
  if (command === '/clear') {
    context.messages.length = 0
    print.info('Chat log cleared.')
    return true
  }

  // if the prompt is "context", print the context
  if (command === '/context') {
    print.info('Context: ')
    print.info(context)
    return true
  }

  // if the prompt is "clearlast", clear the last message
  if (command === '/clearlast') {
    context.messages.pop()
    print.info('Last message cleared.')
    return true
  }

  if (command === '/help') {
    print.info('Available commands:\n/context: Show the current context\n/debug: Print the previous messages\n/log: Print the chat log\n/clear: Clear the chat log\n/clearlast: Clear the last message');
    return true;
  }

  return false
}
