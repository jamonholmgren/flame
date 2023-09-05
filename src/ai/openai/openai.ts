import type { AxiosResponse } from 'axios'
import {
  ChatCompletionResponseMessage,
  Configuration,
  CreateChatCompletionRequest,
  CreateChatCompletionResponse,
  OpenAIApi,
} from 'openai'
import { print } from 'gluegun'

let _openAI: OpenAIApi | null = null
export async function openAI() {
  if (!_openAI) {
    let api_key = process.env.OPENAI_API_KEY
    const organization = process.env.OPENAI_ORGANIZATION

    if (!api_key) {
      throw new Error(
        'OpenAI API Key not found. Please set your OpenAI key as an environment variable. Refer to the README for instructions.'
      )
    }

    _openAI = new OpenAIApi(new Configuration({ apiKey: api_key, organization }))
  }

  return _openAI
}

export const chatGPTPrompt = async (
  options: Partial<CreateChatCompletionRequest>
): Promise<ChatCompletionResponseMessage> => {
  const ai = await openAI()

  const mergedOptions = {
    model: 'gpt-4',
    messages: [],
    functions: [],
    stream: false,
    user: process.env.USER,
    // provided options override defaults
    ...options,
  }

  let response: AxiosResponse<CreateChatCompletionResponse, any>
  try {
    response = await ai.createChatCompletion(mergedOptions)
  } catch (e: any) {
    // Check for 429 rate limit
    if (e?.response?.status === 429) {
      return {
        content: `ERROR: I'm sorry, I'm being rate limited. Please try again in a few minutes.\n\ncode: too_many_requests\n`,
        role: 'assistant',
      }
    }

    // Check if we went over the token limit
    if (e.response?.data?.error?.code === 'context_length_exceeded') {
      return {
        content: `ERROR: I'm sorry, I went over the token limit. Please try again with a shorter prompt.\n\ncode: ${e.response?.data?.error?.code}\n`,
        role: 'assistant',
      }
    }

    console.log('---PROMPT---')
    console.dir({ mergedOptions })
    console.log('---ERROR---')
    console.dir({ response: e.response })

    return {
      content: `ERROR: I'm sorry, I had an error. Please try again.\n\ncode: unknown_error\n`,
      role: 'assistant',
    }
  }

  const message = response.data.choices[0].message
  if (message) return message

  return {
    content: `ERROR: I'm sorry, I had an error. Please try again.\n\ncode: unknown_error\n`,
    role: 'assistant',
  }
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
  if (process.env.OPENAI_API_KEY !== undefined) return true

  print.info('')
  print.error(`Oops -- didn't find an OpenAI key.\n`)
  print.info(print.colors.gray('Please export your OpenAI key as an environment variable.\n'))
  print.highlight('export OPENAI_API_KEY=key_goes_here\n')
  print.info('Get a key here: https://platform.openai.com/account/api-keys')
  print.info('Get access to OpenAI here: https://help.openai.com/en/articles/7102672-how-can-i-access-gpt-4')
  process.exit(1)
}
