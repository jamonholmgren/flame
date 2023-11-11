import { ChatCompletionFunctionMessageParam } from 'openai/resources'
import type { AIMessage, FnCall, ToolCallResult, SessionContext } from '../../types'
import { print } from 'gluegun'

function parseFunctionArgs(args: string) {
  try {
    return JSON.parse(args)
  } catch (error) {
    console.error(`Error parsing function arguments:\n\n${error}`)
    return undefined
  }
}

// Helper function to handle function calls
export async function handleToolCalls(
  message: AIMessage,
  functions: FnCall[],
  context: SessionContext,
): Promise<ToolCallResult[]> {
  let toolCalls = message.tool_calls || []

  if (toolCalls.length === 0 && message.function_call) {
    toolCalls = [
      {
        id: '',
        type: 'function',
        function: message.function_call,
      },
    ]
  }

  const results: ToolCallResult[] = []

  for (const toolCall of toolCalls) {
    const toolCallType = toolCall.type

    if (toolCallType !== 'function') {
      results.push({
        name: toolCallType,
        error: `Unknown tool call type: ${toolCallType}`,
      })
      break
    }

    const fn = toolCall.function
    const name = fn.name

    // Look up function in the registry and call it with the parsed arguments
    const func = functions.find((f) => f.name === name)

    if (!func) {
      results.push({ name, error: `Function '${name}' is not registered.` })
      break
    }

    const functionArgs = parseFunctionArgs(fn.arguments)

    if (!functionArgs) {
      results.push({ name, error: `Error parsing function arguments.` })
      break
    }

    const fileArg = functionArgs.file ? ` (${functionArgs.file})` : ``
    const fnSpinner = print.spin(`Running ${fn.name}${fileArg}...`)

    // call the fn
    const result = await func.fn(functionArgs, context)
    if (result.error) {
      fnSpinner.fail(`Error: ${result.error}`)
      results.push(result)
      break
    }
    fnSpinner.succeed(`${name} complete.`)

    // add the result to the list of results
    results.push(result)
  }

  return results
}
