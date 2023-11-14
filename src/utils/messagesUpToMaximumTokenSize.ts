import { MessageParam } from '../types'
import { countTokens } from './countTokens'

export function messagesUpToMaximumTokenSize(messages: MessageParam[], maximumTokenSize: number): MessageParam[] {
  let tokenCount = 0
  let index = messages.length - 1

  while (index >= 0 && tokenCount < maximumTokenSize) {
    const message = messages[index]
    if (!message) {
      index--
      continue
    }

    if (message.role === 'system') {
      index--
      continue
    }

    tokenCount += countTokens(`${message.content}`)
    index--
  }

  return messages.slice(index + 1)
}
