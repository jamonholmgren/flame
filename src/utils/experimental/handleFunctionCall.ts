import { ChatCompletionResponseMessage } from 'openai'
import { AIFunctions } from '../../ai/functions'
import { SmartContext } from '../../types'
import { print } from 'gluegun'

// Helper function to handle function calls
export async function handleFunctionCall(
  response: ChatCompletionResponseMessage,
  functions: AIFunctions,
  context: SmartContext
) {
  const functionName = response.function_call.name
  let functionArgs
  try {
    functionArgs = JSON.parse(response.function_call.arguments)
  } catch (error) {
    console.error(`Error parsing function arguments: ${error}`)
    return { error: `Error parsing function arguments: ${error}` }
  }

  // Look up function in the registry and call it with the parsed arguments
  const func = functions.find((f) => f.name === functionName)

  if (func) {
    const fileArg = functionArgs.file ? ` (${functionArgs.file})` : ``
    const fnSpinner = print.spin(`Running ${functionName}${fileArg}...`)
    const result = await func.fn(functionArgs, context)

    if (result.error) {
      fnSpinner.fail(`Error: ${result.error}`)
      return result
    }
    fnSpinner.succeed(`${functionName} complete.`)

    if (result.content) {
      print.info(``)
      print.info(print.colors.gray(`${result.content}`))
      print.info(``)
    }

    if (result.patches) {
      print.success(`\nUpdated ${functionArgs.file} with these changes:\n`)

      result.patches.forEach((patch) => {
        print.error(`- ${patch.findLine}`)
        print.success(`+ ${patch.replaceLine.split('\n').join('\n  ')}`)
      })

      print.info(``)
    }

    return result
  } else {
    return { error: `Function '${functionName}' is not registered.` }
  }
}
