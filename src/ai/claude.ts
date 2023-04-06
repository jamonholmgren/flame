import axios from 'axios'

let api_key = process.env.CLAUDE_API_KEY
export async function claudePrompt({ prompt }: { prompt: string }) {
  if (!api_key) {
    console.log('Please export your CLAUDE_API_KEY before using this.')

    process.exit(1)
  }

  const response = await axios.post(
    'https://api.anthropic.com/v1/complete',
    {
      prompt: `\n\nHuman: ${prompt}\n\nAssistant: \n\`\`\`\n`,
      model: 'claude-v1',
      max_tokens_to_sample: 11000,
      stop_sequences: ['\n```\n'],
    },
    {
      headers: {
        'x-api-key': api_key,
        'content-type': 'application/json',
      },
    }
  )

  return response.data
}
