// import openai
import { Configuration, OpenAIApi } from 'openai'

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
  }

  return _openAI
}
