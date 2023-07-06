import {
  ChatCompletionRequestMessage,
  Configuration,
  CreateChatCompletionResponse,
  OpenAIApi,
} from 'openai'
import { prompt } from '../utils/prompt'
import { AxiosResponse } from 'axios'

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
        organization: 'org-wGbmhq3o3vYMbSrhmW6TA88N', // Jamon's personal org
      })
    )
  }

  return _openAI
}

export const chatGPTPrompt = async ({
  messages,
  model = 'gpt-4', // Default to 'gpt-4'
}: {
  messages: ChatCompletionRequestMessage[]
  model?: string
}) => {
  const ai = await openAI()

  let response: AxiosResponse<CreateChatCompletionResponse, any>
  try {
    response = await ai.createChatCompletion({
      model,
      messages,
      max_tokens: 2000,
      temperature: 0,
      n: 1, // return the best result
      stream: false,
      user: process.env.USER,
    })
  } catch (e) {
    console.log('---PROMPT---')
    console.dir(messages)
    console.log('---ERROR---')
    console.dir(e.response)
    return `ERROR: I'm sorry, I had an error. Please try again.\n\n`
  }

  return response.data.choices.map((choice) => choice.message.content).join('\n\n')
}
