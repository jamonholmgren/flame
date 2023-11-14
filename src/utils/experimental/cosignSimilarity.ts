export function cosineSimilarity(a: number[], b: number[]) {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const aValue = a[i] ?? 0
    const bValue = b[i] ?? 0
    dotProduct += aValue * bValue
    normA += aValue * aValue
    normB += bValue * bValue
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}
