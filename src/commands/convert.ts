import { GluegunCommand } from 'gluegun'
import { openAI } from '../ai/openai'
import { ChatCompletionRequestMessage } from 'openai'

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

    // const additionalInstructions = toolbox.parameters.third || ''

    // show a spinner
    print.info(`\nConverting ${sourceFile} from ${from} to ${to}\n`)

    const spinner = print.spin(`Reading ${sourceFile}`)
    spinner.start()

    // read the source file
    const sourceFileContents = await toolbox.filesystem.readAsync(sourceFile)

    // update spinner
    spinner.succeed()
    spinner.text = `Loading ${from}-to-${to} recipe`
    spinner.start()

    // ensure there's a recipe for this conversion
    try {
      var { recipe } = require(`../recipes/${from}-to-${to}`)
    } catch (e) {
      print.error(`No recipe found for converting from ${from} to ${to}`)
      return
    }

    // check if shouldConvert the file
    if (recipe.shouldConvert && !recipe.shouldConvert(sourceFileContents)) {
      spinner.succeed()
      print.error(
        `\nThis file does not need to be converted from ${from} to ${to}.`
      )
      return
    }

    // update spinner
    spinner.succeed()
    spinner.text = `ChatGPT is converting ${sourceFile} from ${from} to ${to}`
    spinner.start()

    const messages: ChatCompletionRequestMessage[] = [
      {
        content: recipe.prompt,
        role: 'system',
      },
      {
        content: `Here is the source file:\n\n\`\`\`\n${sourceFileContents}\n\`\`\``,
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
        // top_p: 1,
        // presence_penalty: 0,
        // frequency_penalty: 0,
        // best_of: 1, // test a couple options
        // n: 1, // return the best result
        stream: false,
        // stop: ['```'],
        // get current OS username and use that here to prevent spamming
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

    const revampedCodeMessage = response.data.choices[0].message.content

    // strip any backticks before and after the code block
    const revampedCode = revampedCodeMessage
      .replace(/^```/, '')
      .replace(/```$/, '')

    // now write that back to the source file
    await toolbox.filesystem.writeAsync(sourceFile, revampedCode)

    // update spinner
    spinner.succeed()

    // success
    print.success(`Converted ${from} to ${to} in ${sourceFile}!`)
  },
}

module.exports = command
