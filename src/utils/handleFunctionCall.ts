import { ChatCompletionResponseMessage } from 'openai'
import { AIFunctions } from '../ai/functions'
import { SmartContext } from '../types'

// Helper function to handle function calls
export async function handleFunctionCall(
  response: ChatCompletionResponseMessage,
  functions: AIFunctions,
  context: SmartContext
) {
  const functionName = response.function_call.name
  const functionArgs = JSON.parse(response.function_call.arguments)

  // Look up function in the registry and call it with the parsed arguments
  const func = functions.find((f) => f.name === functionName)

  if (func) {
    return func.fn(functionArgs, context)
  } else {
    return { error: `Function '${functionName}' is not registered.` }
  }
}