// export types

import { ChatCompletionRequestMessage } from 'openai'

export type Message = ChatCompletionRequestMessage

/**
 * Context includes tasks that we are working on, files that we have opened,
 * and previous messages that we have sent.
 *
 * With that information, we can provide a better, more relevant backchat.
 *
 * It gets updated in the flame-history.json file that is created in src/utils/chatHistory.ts.
 */
export type SmartContext = {
  tasks: {
    name: string
    contents: string
    embeddings?: number[]
  }[]
  files: {
    path: string
    contents: string
    embeddings?: number[]
  }[]
  messages: Message[]
}
