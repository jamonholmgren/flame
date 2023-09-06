/**
 * Super-basic token estimator. Eventually, this should be replaced by a
 * real tokenizer like gpt-tokenizer or similar.
 *
 * OpenAI says that tokens are roughly equivalent to 4 characters. In
 * our tests, this seems to be fairly accurate.
 */
export function countTokens(str: string): number {
  return Math.floor(str.length / 4)
}

/**
 * Returns estimated cost as a string for printing.
 */
export function estimatedCost(promptTokens: number, responseTokens: number, model = 'gpt-4'): string {
  if (model === 'gpt-4') {
    // $0.03 / 1K tokens and $0.06 / 1K tokens
    const promptCost = Math.round((promptTokens / 1000) * 0.03 * 100) / 100
    const responseCost = Math.round((responseTokens / 1000) * 0.06 * 100) / 100
    return `~$${promptCost + responseCost}`
  } else {
    return `Unknown model: ${model}`
  }
}
