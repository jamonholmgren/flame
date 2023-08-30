import { chatGPTPrompt } from '../ai/openai/openai'

/**
 * Generates a summary of the given text using gpt-3.5-turbo.
 *
 * @param text The text to summarize.
 * @returns The generated summary.
 */
export async function generateSummary(preprompt: string, text: string): Promise<string> {
  const prompt = `${preprompt}\n\n${text}`

  const response = await chatGPTPrompt({
    messages: [{ role: 'user', content: prompt }],
    model: 'gpt-3.5-turbo',
  })

  return response.content
}
