import { filesystem } from 'gluegun'
import type { Message } from '../types'

export async function listFiles(path: string) {
  // list files
  const files = await filesystem.listAsync(path)

  const message: Message = {
    content: `
Here's the contents of ${path}:

\`\`\`
${(files || []).join('\n')}
\`\`\`
`,
    role: 'user',
    age: 5,
    importance: 'normal',
  }

  return { message }
}
