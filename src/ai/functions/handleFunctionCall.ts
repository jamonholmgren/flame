import { ChatCompletionResponseMessage } from 'openai'
import { ChatCompletionFunction, ChatCompletionFunctionResult } from '../../types'

// Helper function to handle function calls from OpenAI
export async function handleFunctionCall(
  response: ChatCompletionResponseMessage,
  functions: ChatCompletionFunction[]
): Promise<ChatCompletionFunctionResult> {
  if (!response.function_call) return { content: response.content }

  const functionName = response.function_call.name
  const functionArgs = JSON.parse(response.function_call.arguments)

  // Look up function in the registry and call it with the parsed arguments
  const func = functions.find((f) => f.name === functionName)

  if (!func) return { error: `Function '${functionName}' is not registered.` }

  // todo: handle actual errors
  const result = await func.fn(functionArgs)

  return result
}
