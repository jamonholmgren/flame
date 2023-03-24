import { GluegunCommand } from 'gluegun'
import { openAI } from '../ai/openai'

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

    // read the source file
    const sourceFileContents = await toolbox.filesystem.readAsync(sourceFile)

    // TODO: ensure there's a recipe for this conversion

    // load the recipe
    const { recipe } = require(`../recipes/${from}-to-${to}`)

    const fullPrompt = `
${recipe.prompt}

// Now here is a React Native (typescript) file using ${from} (look for "// ===" to delimit after the end of the file):

${sourceFileContents}

// ===

// Now the same file using ${to} instead of ${from}. Matches the original code as closely as possible.
// Updates all relevant types and imports.
// Only outputs one copy of the file and doesn't repeat the file.
${recipe.finalNotes}

`

    // console.log(fullPrompt)

    const openai = await openAI()
    try {
      var response = await openai.createCompletion({
        model: 'code-davinci-002',
        prompt: fullPrompt,
        max_tokens: 3000,
        temperature: 0,
        // top_p: 1,
        // presence_penalty: 0,
        // frequency_penalty: 0,
        // best_of: 1, // test a couple options
        n: 1, // return the best result
        stream: false,
        stop: ['```'],
        // get current OS username and use that here to prevent spamming
        user: process.env.USER,
      })
    } catch (e) {
      print.error(e)
      print.error(e.response.data.error)
    }

    if (!response?.data?.choices) {
      print.error('Error or no response from OpenAI')
      return
    }

    const revampedCode = response.data.choices[0].text

    // now write that back to the source file
    await toolbox.filesystem.writeAsync(sourceFile, revampedCode)

    // success
    print.success(`Converted ${from} to ${to} in ${sourceFile}!`)
  },
}

module.exports = command
