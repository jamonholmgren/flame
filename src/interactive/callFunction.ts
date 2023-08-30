import { print, prompt } from 'gluegun'
import { ChatCompletionResponseMessage } from 'openai'
import { ChatCompletionFunction } from '../types'
import { FileDiff } from '../utils/parseGitDiff'

type CallFunctionOptions = {
  functionName: string
  functionArgs: string
  functions: ChatCompletionFunction[]
  aiResponse: ChatCompletionResponseMessage
  sourceFileContents: string
  fileData: FileDiff
}

export async function callFunction({
  functionName,
  functionArgs,
  functions,
  aiResponse,
  sourceFileContents,
  fileData,
}: CallFunctionOptions) {
  // Look up function in the registry and call it with the parsed arguments
  const func = functionName && functions.find((f) => f.name === functionName)

  if (!func) {
    // If there's no function call, maybe there's content to display?
    if (aiResponse.content) {
      print.info(aiResponse.content)
    }

    return { doneWithFile: false }
  }

  const result = await func.fn(functionArgs)

  if (func.name === 'createFile') {
    fileData.change = 'created'
  } else if (func.name === 'patch') {
    fileData.change = 'modified'
  } else if (func.name === 'deleteFile') {
    fileData.change = 'deleted'
  }

  return { result, doneWithFile: true }
}
