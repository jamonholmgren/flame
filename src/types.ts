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
  // Project context, continually updated
  project: string // "flame is a gluegun cli that uses AI to modify code"

  // Specific tasks we are working on
  tasks: {
    name: string // "interactive smartcontext"
    contents: string // "create a smartcontext that can be used in the interactive command"
    embeddings?: number[] // embedding to determine relevance to current messages
  }[]

  // Files we have loaded
  files: {
    path: string
    contents: string
    embeddings?: number[]
  }[]

  // Previous messages we have sent
  messages: Message[]
}
