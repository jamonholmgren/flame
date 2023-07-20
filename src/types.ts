// export types

import { ChatCompletionRequestMessage } from 'openai'

export type Message = ChatCompletionRequestMessage & {
  age?: number
  importance?: 'important' | 'normal' | 'optional'
}
