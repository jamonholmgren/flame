import { createEmbedding } from '../../ai/openai/openai'
import { SmartContext } from '../../types'

export async function updateCurrentTaskEmbeddings(context: SmartContext) {
  const embedding = await createEmbedding(
    `${context.currentTask}\n\n${context.messages
      .filter((m) => m.role !== 'function' && (m.content?.length || 0) > 0)
      .slice(-3)
      .map((m) => m.content)
      .join('\n')}`
  )
  context.currentTaskEmbeddings = embedding[0].embedding
}
