// import openai
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai'

import { prompt } from '../utils/prompt'

// validate that we have the API key, and if not,
// get it from a user prompt
let _openAI: OpenAIApi | null = null
export async function openAI() {
  if (!_openAI) {
    let api_key = process.env.OPENAI_API_KEY
    if (!api_key) {
      console.log('Please enter your OpenAI API key:')

      api_key = await prompt('OpenAI API Key: ')
    }
    _openAI = new OpenAIApi(
      new Configuration({
        apiKey: api_key,
      })
    )
    // const response = await _openAI.listModels()
    // response.data.data.map((d: any) => console.dir(d))
  }

  return _openAI
}

export const chatGPTPrompt = async ({
  prompts,
}: {
  prompts: ChatCompletionRequestMessage[]
}) => {
  const ai = await openAI()

  let response
  try {
    response = await ai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: prompts,
      max_tokens: 2000,
      temperature: 0,
      // top_p: 1,
      // presence_penalty: 0,
      // frequency_penalty: 0,
      // best_of: 1, // test a couple options
      n: 1, // return the best result
      stream: false,
      // stop: ['\n\n'],
      // get current OS username and use that here to prevent spamming
      user: process.env.USER,
    })
  } catch (e) {
    console.log('---PROMPT---')
    console.dir(prompts)
    console.log('---ERROR---')
    console.dir(e.response.data.error)
    return `I'm sorry, I had an error. Please try again.\n\n`
  }

  return response.data.choices
    .map((choice) => choice.message.content)
    .join('\n\n')
}
