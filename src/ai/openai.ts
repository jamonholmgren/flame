import {
  ChatCompletionFunctions,
  ChatCompletionRequestMessage,
  ChatCompletionResponseMessage,
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
      throw new Error(
        'OpenAI API Key not found. Please set your OpenAI key as an environment variable. Refer to the README for instructions.'
      )
    }
    if (!api_key) {
      console.log('Please enter your OpenAI API key:')
      api_key = await prompt('OpenAI API Key: ')
    }
    _openAI = new OpenAIApi(
      new Configuration({
        apiKey: api_key,
        organization: 'org-wGbmhq3o3vYMbSrhmW6TA88N', // Jamon's personal org
        // organization: "org-LJcL2W6sS6OZDEwkoA3ZnWGh", // Infinite Red
      })
    )
  }

  return _openAI
}

export const chatGPTPrompt = async ({
  messages,
  model = 'gpt-4', // Default to 'gpt-4'
  functions = undefined,
}: {
  messages: ChatCompletionRequestMessage[]
  model?: string
  functions?: ChatCompletionFunctions[]
}) => {
  const ai = await openAI()

  let response: AxiosResponse<CreateChatCompletionResponse, any>
  try {
    response = await ai.createChatCompletion({
      model,
      messages,
      functions,
      max_tokens: 2000,
      temperature: 0,
      n: 1, // return the best result
      stream: false,
      user: process.env.USER,
    })
  } catch (e) {
    // Check if it's a rate limit
    if (e.response?.data?.error?.code === 'too_many_requests') {
      return {
        content: `ERROR: I'm sorry, I'm being rate limited. Please try again in a few minutes.\n\ncode: ${e.response?.data?.error?.code}\n`,
        role: 'assistant',
      } satisfies ChatCompletionResponseMessage
    }
    // Check if we went over the token limit
    if (e.response?.data?.error?.code === 'context_length_exceeded') {
      return {
        content: `ERROR: I'm sorry, I went over the token limit. Please try again with a shorter prompt.\n\ncode: ${e.response?.data?.error?.code}\n`,
        role: 'assistant',
      } satisfies ChatCompletionResponseMessage
    }

    console.log('---PROMPT---')
    console.dir(messages)
    console.log('---ERROR---')
    console.dir(e.response)
    return {
      content: `ERROR: I'm sorry, I had an error. Please try again.\n\n`,
      role: 'assistant',
    } satisfies ChatCompletionResponseMessage
  }

  return response.data.choices[0].message
}

export async function createEmbedding(text: string) {
  const ai = await openAI()

  const embeddingsResponse = await ai.createEmbedding({
    input: text,
    model: 'text-embedding-ada-002',
  })

  return embeddingsResponse.data.data
}

export function checkOpenAIKey() {
  return process.env.OPENAI_API_KEY !== undefined
}
