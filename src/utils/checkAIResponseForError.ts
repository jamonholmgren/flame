import { print, prompt } from 'gluegun'
import type { FileData } from '../types'
import type { ChatCompletionResponseMessage } from 'openai'

type CheckAIResponseForErrorOptions = {
  aiResponse: ChatCompletionResponseMessage
  sourceFileContents: string
  fileData: FileData
}

export async function checkAIResponseForError({
  aiResponse,
  sourceFileContents,
  fileData,
}: CheckAIResponseForErrorOptions) {
  // if we're being rate limited, we need to stop for a bit and try again
  if (aiResponse.content.includes('too_many_requests')) {
    print.error(`🛑 I'm being rate limited. Wait a while and try again.\n`)
    const retry = await prompt.confirm('Try again or skip this file?')
    if (!retry) return { doneWithFile: true }
  } else if (aiResponse.content.includes('context_length_exceeded')) {
    const len = sourceFileContents.length
    print.error(`🛑 File is too long (${len} characters), skipping! Not enough tokens.`)
    fileData.change = 'skipped'
    fileData.error = 'file too long'
    return { doneWithFile: true }
  } else if (aiResponse.content.includes('unknown_error')) {
    print.error(`🛑 Unknown error, skipping!`)
    fileData.change = 'skipped'
    fileData.error = 'unknown error'
    return { doneWithFile: true }
  }

  return { doneWithFile: false }
}
