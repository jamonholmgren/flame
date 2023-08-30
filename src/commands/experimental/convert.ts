/**
 * This is an experimental Flame command that uses OpenAI's API to convert code
 * from one thing to another; whether it's a new version or an alternative library
 * or whatever.
 *
 * It needs some TLC; there are some new features in the OpenAI API (specifically,
 * function calling) that would make it much more efficient. (See the "upgrade react-native"
 * command as an example of using function calling.)
 *
 * Additionally, this would be much more useful with gpt-4-32k, which I currently do not
 * have access to. Bummer.
 *
 * Usage:
 *
 * 1. Make sure you have an OPENAI_API_KEY in your environment
 * 2. Make sure there's a recipe for the conversion you want to do in src/recipes
 * 3. Run `flame convert <from> <to> <sourceFile>`
 *
 * e.g. `flame convert ava jest src/index.js`
 *
 */
import { GluegunCommand } from 'gluegun'
import { openAI } from '../../ai/openai/openai'
import { ChatCompletionRequestMessage } from 'openai'
import { chunkByLines } from '../../utils/chunkByLines'

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

    // get lineChunks parameter
    const lineChunks = parameters.options.lineChunks ? parameters.options.lineChunks.split(',').map(Number) : undefined

    // show a spinner
    print.info(`\nConverting ${sourceFile} from ${from} to ${to}\n`)

    const spinner = print.spin(`Reading ${sourceFile}`)
    spinner.start()

    // read the source file
    let sourceFileContents = await toolbox.filesystem.readAsync(sourceFile)

    // update spinner
    spinner.succeed()
    spinner.text = `Loading ${from}-to-${to} recipe`
    spinner.start()

    // ensure there's a recipe for this conversion
    let recipe: Recipe
    try {
      const recipeExport = require(`../recipes/${from}-to-${to}`) as { recipe: Recipe }
      recipe = recipeExport.recipe
    } catch (e) {
      print.error(`No recipe found for converting from ${from} to ${to}`)
      return
    }

    // check if shouldConvert the file
    if (recipe.shouldConvert && !recipe.shouldConvert(sourceFileContents)) {
      spinner.succeed()
      print.error(`\nThis file does not need to be converted from ${from} to ${to}.`)
      return
    }

    // Split the source file into chunks at function boundaries if it's too large
    const MAX_SIZE = 5000
    let chunks = [sourceFileContents]

    if (sourceFileContents.length > MAX_SIZE) {
      // If recipe includes a chunk function, use that to chunk the code
      if (recipe.chunk) {
        chunks = recipe.chunk(sourceFileContents, { lineChunks })
      } else {
        // Otherwise, split at function boundaries or use lineChunks if provided
        let splitArray: number[] = lineChunks

        if (!splitArray || splitArray.length === 0) {
          // Default to chunking every 1000 lines if no lineChunks provided
          splitArray = Array(Math.ceil(sourceFileContents.split('\n').length / 1000))
            .fill(0)
            .map((_, idx) => 1000 * idx)
        }

        chunks = chunkByLines(sourceFileContents, splitArray).filter((chunk) => chunk.trim().length > 0)
      }
    }

    // update spinner
    spinner.succeed()
    spinner.text = `AI conversion of ${sourceFile} from ${from} to ${to}`
    spinner.start()

    let revampedCode = ''
    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i]

      // Update spinner text to show progress for chunks
      spinner.text = `AI conversion of ${sourceFile} from ${from} to ${to} (${i + 1} of ${chunks.length})`

      const messages: ChatCompletionRequestMessage[] = [
        {
          content: recipe.prompt,
          role: 'system',
        },
        {
          content: `Here is the source file:\n\n\`\`\`\n${chunk}\n\`\`\``,
          role: 'system',
        },
        {
          content: recipe.admonishments,
          role: 'system',
        },
      ]

      const openai = await openAI()
      try {
        var response = await openai.createChatCompletion({
          model: 'gpt-4',
          messages,
          // max_tokens: 3000,
          // temperature: 0,
          // functions, // TODO: important
          user: process.env.USER,
        })
      } catch (e) {
        print.error(e)
        print.error(e.response.data.error)
        return
      }

      if (!response?.data?.choices) {
        print.error('Error or no response from OpenAI')
        return
      }

      // update spinner
      spinner.succeed()
      spinner.text = `Writing updated code to ${sourceFile}`
      spinner.start()

      // TODO: implement function calling!
      const chunkRevampedCodeMessage = response.data.choices[0].message.content

      // strip any line that starts and ends with backticks
      const chunkRevampedCode = chunkRevampedCodeMessage.replace(/^```.*\n/gm, '').replace(/```.*\n$/gm, '')

      // concatenate the revamped chunk to the output code
      revampedCode += chunkRevampedCode + '\n'
    }

    // now write the full revamped code back to the source file
    await toolbox.filesystem.writeAsync(sourceFile, revampedCode)

    // update spinner
    spinner.succeed()

    // success
    print.success(`Converted ${from} to ${to} in ${sourceFile}!`)
  },
}

module.exports = command
