import { print } from 'gluegun'
import { ageMessages } from './ageMessages'

export function handleSpecialCommand(command: string, prevMessages: any[], debugLog: any[]) {
  // if the prompt is empty, skip it and try again
  if (command.trim() === '') return true

  // if the prompt is "debug", print the previous messages
  if (command === 'debug') {
    print.info(debugLog)
    return true
  }

  // if the prompt is "log", print the chat log
  if (command === 'log') {
    print.info(prevMessages)
    return true
  }

  // if the prompt is "clear", clear the chat log
  if (command === 'clear') {
    prevMessages.length = 0
    print.info('Chat log cleared.')
    return true
  }

  // if the prompt is "clearlast", clear the last message
  if (command === 'clearlast') {
    prevMessages.pop()
    print.info('Last message cleared.')
    return true
  }

  // if the prompt starts with "logcompress", logcompress the chat log
  if (command === 'logcompress' || command.startsWith('logcompress ')) {
    const targetLength = parseInt(command.split(' ')[1], 10) || 8000
    ageMessages(prevMessages, targetLength)
    print.info(`Chat log compressed to ${targetLength} characters.`)
    return true
  }

  return false
}
