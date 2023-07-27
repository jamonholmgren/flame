import { SmartContext } from '../types'
import { cosineSimilarity } from './cosignSimilarity'

export function mostRelevantFiles(context: SmartContext, minSimilarity = 0.8) {
  // if we don't have any files or the current task doesn't have embeddings...exit
  if (Object.keys(context.files).length === 0 || context.currentTaskEmbeddings) return []

  // otherwise, we'll check the cosine similarity of the current task embeddings
  const relevantFiles = Object.values(context.files)
    .map((file) => {
      // check its relevancy
      if (file.embeddings) {
        // if it has embeddings, we'll check the cosine similarity
        const similarity = cosineSimilarity(context.currentTaskEmbeddings, file.embeddings)
        return { file, similarity }
      } else {
        return { file, similarity: 0 }
      }
    })
    .filter((a) => a.similarity > minSimilarity) // has to be > minSimilarity or we don't show it
    .sort((a, b) => b.similarity - a.similarity) // sorted by most similar first
  return relevantFiles
}
