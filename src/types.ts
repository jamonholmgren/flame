import type OpenAI from 'openai'

export type ProjectFile = {
  path: string
  embeddings?: number[]
  length?: number
}

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

  // working folder
  workingFolder: string

  // Files we have loaded
  files: {
    [path: string]: ProjectFile
  }

  // Current file we are working on
  currentFile?: string

  // Description of current task we are working on
  currentTask?: string

  // Previous messages we have sent
  messages: MessageParam[]

  // Embeddings for the current task + last several messages
  currentTaskEmbeddings?: number[]
}

export type ListFilesOptions = {
  recursive?: boolean
  ignore?: string[]
}

export type FunctionCallResult = {
  content?: string
  error?: string
  undo?: () => Promise<void>
  changes?: string
  next?: 'resubmit' | 'skip' | 'done'
}

export type ChatCompletionFunction = FunctionCall & {
  fn: (args: any, context?: SmartContext) => Promise<FunctionCallResult>
}

export type CLIOptions = {
  interactive?: boolean
  list?: boolean
  only?: string
  debug?: boolean
  cacheFile?: string
  from?: string
  to?: string
  help?: boolean
  costs?: boolean
}

export type FileData = {
  path: string
  diff: string
  change: 'pending' | 'created' | 'modified' | 'deleted' | 'skipped' | 'ignored' | 'error'
  error?: string
  customPrompts: string[]
}

export type MessageParam = OpenAI.Chat.ChatCompletionMessageParam
export type MessageCompletion = OpenAI.Chat.Completions.ChatCompletionMessage
export type FunctionCall = OpenAI.Chat.ChatCompletionCreateParams.Function
export type ChatRequest = OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
export type ChatCompletion = OpenAI.Chat.Completions.ChatCompletion
