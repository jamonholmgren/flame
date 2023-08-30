import { print, prompt } from 'gluegun'
import { ChatCompletionResponseMessage } from 'openai'
import { ChatCompletionFunction } from '../types'
import type { FileData } from '../types'

type CallFunctionOptions = {
  functionName: string
  functionArgs: string
  functions: ChatCompletionFunction[]
  aiResponse: ChatCompletionResponseMessage
  fileData: FileData
}

export async function callFunction({
  functionName,
  functionArgs,
  functions,
  aiResponse,
  fileData,
}: CallFunctionOptions) {
  // Look up function in the registry and call it with the parsed arguments
  const func = functionName && functions.find((f) => f.name === functionName)

  if (!func) {
    // If there's no function call, maybe there's content to display?
    if (aiResponse.content) {
      print.info('\n' + aiResponse.content + '\n')
      const tryAgain = await prompt.confirm('Try again?')
      if (tryAgain) return { doneWithFile: false }
    }

    return { doneWithFile: true }
  }

  const result = await func.fn(functionArgs)

  if (func.name === 'createFile') {
    fileData.change = 'created'
  } else if (func.name === 'patch') {
    fileData.change = 'modified'
  } else if (func.name === 'deleteFile') {
    fileData.change = 'deleted'
  }

  return { result, doneWithFile: false }
}
