import type OpenAI from 'openai'

export type SessionContext = {
  cwd: string
  project: string
  currentFile: string
  files: string[]
  messages: MessageParam[]
}

export type ListFilesOptions = {
  recursive?: boolean
  ignore?: string[]
  maxDepth?: number
  currentDepth?: number
}

export type ToolCallResult = {
  name: string
  content?: string
  error?: string
  undo?: () => Promise<void>
  changes?: string
  next?: 'resubmit' | 'skip' | 'done'
}

export type FnCall = FunctionCall & {
  fn: (args: any, context?: SessionContext) => Promise<ToolCallResult>
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
export type SystemMessageParam = OpenAI.Chat.ChatCompletionSystemMessageParam
export type AIMessage = OpenAI.Chat.Completions.ChatCompletionMessage
export type FunctionCall = OpenAI.Chat.ChatCompletionCreateParams.Function
export type ChatRequest = OpenAI.Chat.ChatCompletionCreateParamsNonStreaming
export type ChatCompletion = OpenAI.Chat.Completions.ChatCompletion
