/**
 * This is an experimental Flame command that uses OpenAI's API to convert code
 * from one thing to another; whether it's a new version or an alternative library
 * or whatever.
 *
 * Additionally, this would be much more useful with gpt-4-32k, which I currently do not
 * have access to. Bummer.
 *
 * Usage:
 *
 * 1. Make sure you have an OPENAI_API_KEY in your environment
 * 2. Make sure there's a recipe for the conversion you want to do in src/recipes
 * 3. Run `flame experimental convert <from> <to> <sourceFile>`
 *
 * e.g. `flame experimental convert ava jest src/index.js`
 *
 */
import { GluegunCommand } from 'gluegun'
import { openAI } from '../../ai/openai/openai'
import type { FnCall, MessageParam } from '../../types'
import { patch } from '../../ai/openai/functions/patch'
import { callFunction } from '../../utils/callFunction'

// type for recipes
type Recipe = {
  prompt: string
  admonishments?: string
  chunk?: (sourceFileContents: string, options: object) => string[]
  shouldConvert?: (sourceFileContents: string) => boolean
}

const command: GluegunCommand = {
  name: 'convert',
  run: async (toolbox) => {
    const { print, parameters } = toolbox

    // first parameter is what we want to change from
    const from = parameters.first

    // second parameter is what we want to change to
    const to = parameters.second

    // get the third parameter as the source file
    const sourceFile = parameters.third

    if (!sourceFile) {
      print.error('You must specify a source file to convert.')
      return
    }

    // show a spinner
    print.info(`\nConverting ${sourceFile} from ${from} to ${to}\n`)

    const spinner = print.spin(`Reading ${sourceFile}`)
    spinner.start()

    // read the source file
    let sourceFileContents = await toolbox.filesystem.readAsync(sourceFile)

    // check if the file exists
    if (!sourceFileContents) {
      spinner.fail()
      print.error(`\nCould not find ${sourceFile}`)
      return
    }

    // update spinner
    spinner.succeed()
    spinner.text = `Loading ${from}-to-${to} recipe`
    spinner.start()

    // ensure there's a recipe for this conversion
    let recipe: Recipe
    try {
      const recipeExport = require(`../../recipes/${from}-to-${to}`) as { recipe: Recipe }
      recipe = recipeExport.recipe
    } catch (e) {
      spinner.fail()
      print.error(`No recipe found for converting from ${from} to ${to}`)
      return
    }

    // check if shouldConvert the file
    if (recipe.shouldConvert && !recipe.shouldConvert(sourceFileContents)) {
      spinner.succeed()
      print.error(`\nThis file does not need to be converted from ${from} to ${to}.`)
      return
    }

    // update spinner
    spinner.succeed()
    spinner.text = `AI conversion of ${sourceFile} from ${from} to ${to}`
    spinner.start()

    // Update spinner text to show progress for chunks
    spinner.text = `AI conversion of ${sourceFile} from ${from} to ${to}`

    const messages: MessageParam[] = [
      {
        content: recipe.prompt,
        role: 'system',
      },
      {
        content: `Here is the source file (${sourceFile}):\n\n\`\`\`\n${sourceFileContents}\n\`\`\``,
        role: 'system',
      },
      {
        content: recipe.admonishments || '',
        role: 'system',
      },
    ]

    const openai = await openAI()

    const functions: FnCall[] = [patch]

    try {
      var response = await openai.chat.completions.create({
        model: 'gpt-4-1106-preview',
        messages,
        // max_tokens: 3000,
        // temperature: 0,
        functions,
        user: process.env.USER,
      })
    } catch (e: any) {
      print.error(e)
      print.error(e.response.data.error)
      return
    }

    if (!response?.choices) {
      print.error('Error or no response from OpenAI')
      return
    }

    // update spinner
    spinner.succeed()
    spinner.text = `Writing updated code to ${sourceFile}`
    spinner.start()

    const message = response.choices[0]?.message

    if (!message) {
      print.error('Error or no response from OpenAI')
      return
    }

    if (message.content) {
      print.error(message.content)
      return
    }

    const functionName = message.function_call?.name || 'unknown'
    const functionArgs = JSON.parse(message.function_call?.arguments || '{}')
    const aiMessage = message
    const fileData = {} as any

    await callFunction({ functionName, functionArgs, functions, aiResponse: aiMessage, fileData })

    // update spinner
    spinner.succeed()

    // success
    print.success(`Converted ${from} to ${to} in ${sourceFile}!`)
  },
}

export default command
