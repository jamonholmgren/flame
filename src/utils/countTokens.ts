/**
 * Super-basic token estimator. Eventually, this should be replaced by a
 * real tokenizer like gpt-tokenizer or similar.
 *
 * OpenAI says that tokens are roughly equivalent to 4 characters. However,
 * since we are mainly using code, we go with 3 characters to be safe.
 */
export function countTokens(str: string): number {
  return str.length / 3
}

/**
 * Returns estimated cost as a string for printing.
 */
export function estimatedCost(tokens: number, model = 'gpt-4'): string {
  if (model === 'gpt-4') {
    return `~$${Math.floor((tokens / 10) * 0.003) * 100}`
  } else {
    return `Unknown model: ${model}`
  }
}
