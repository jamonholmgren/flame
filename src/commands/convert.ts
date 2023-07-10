import { GluegunCommand } from 'gluegun'
import { openAI } from '../ai/openai'
import { ChatCompletionRequestMessage } from 'openai'

// type for recipes
type Recipe = {
  prompt: string
  finalNotes?: string
  chunk?: (sourceFileContents: string) => string[]
  shouldConvert?: (sourceFileContents: string) => boolean
}

const command: GluegunCommand = {
  name: 'convert',
  run: async (toolbox) => {
    const { print } = toolbox

    // first parameter is what we want to change from
    const from = toolbox.parameters.first

    // second parameter is what we want to change to
    const to = toolbox.parameters.second

    // get the third parameter as the source file
    const sourceFile = toolbox.parameters.third

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
        chunks = recipe.chunk(sourceFileContents)
      } else {
        // Otherwise, split at function boundaries
        // This regex splits the code at function boundaries.
        chunks = sourceFileContents.split(/\n(?=function\s*\w*\s*\()/)
      }
    }

    // update spinner
    spinner.succeed()
    spinner.text = `ChatGPT is converting ${sourceFile} from ${from} to ${to}`
    spinner.start()

    let revampedCode = ''
    for (let chunk of chunks) {
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
          content: recipe.finalNotes,
          role: 'system',
        },
      ]

      const openai = await openAI()
      try {
        var response = await openai.createChatCompletion({
          model: 'gpt-4',
          messages,
          max_tokens: 3000,
          temperature: 0,
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

      const chunkRevampedCodeMessage = response.data.choices[0].message.content

      // strip any backticks before and after the code block
      const chunkRevampedCode = chunkRevampedCodeMessage.replace(/^```/, '').replace(/```$/, '')

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
