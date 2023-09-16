import { chatGPTPrompt } from '../ai/openai/openai'
import { codeSummaryPrompt } from '../prompts/codeSummaryPrompt'

export async function fetchCodeSummary(filename: string, fileContents: string): Promise<string> {
  const prompt = codeSummaryPrompt(fileContents)

  const response = await chatGPTPrompt({
    messages: [{ content: prompt, role: 'user' }],
    model: 'gpt-3.5-turbo',
  })

  return `// File: ${filename}\n\n${response.content}`
}
