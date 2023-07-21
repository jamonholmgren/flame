import { print } from 'gluegun'
import { SmartContext } from '../types'

export function handleSpecialCommand(command: string, context: SmartContext, debugLog: any[]) {
  // if the prompt is empty, skip it and try again
  if (command.trim() === '') return true

  // if the prompt is "debug", print the previous messages
  if (command === 'debug') {
    print.info(debugLog)
    return true
  }

  // if the prompt is "log", print the chat log
  if (command === 'log') {
    print.info(context.messages)
    return true
  }

  // if the prompt is "log N", print the chat log last N messages
  if (command.startsWith('log ')) {
    const targetLength = parseInt(command.split(' ')[1], 10) || 10
    print.info(context.messages.slice(-targetLength))
    return true
  }

  // if the prompt is "clear", clear the chat log
  if (command === 'clear') {
    context.messages.length = 0
    print.info('Chat log cleared.')
    return true
  }

  // if the prompt is "context", print the context
  if (command === 'context') {
    print.info('Context: ')
    print.info(context)
    return true
  }

  // if the prompt is "clearlast", clear the last message
  if (command === 'clearlast') {
    context.messages.pop()
    print.info('Last message cleared.')
    return true
  }

  return false
}
