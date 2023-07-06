export async function retryOnFail(fn, retries = 3, delay = 60000) {
  try {
    return await fn()
  } catch (error) {
    if (error.response && error.response.status === 429) {
      // If we received a 429 status code, we've been rate limited
      const rateLimitReset = error.response.headers['x-ratelimit-reset']
      if (rateLimitReset) {
        // If the 'x-ratelimit-reset' header is present, use it to calculate the delay
        const newDelay = Math.max(delay, new Date(rateLimitReset).getTime() - Date.now())
        console.warn(
          `Rate limit encountered. Waiting for ${newDelay / 1000} seconds before next attempt.`
        )
        delay = newDelay
      } else {
        console.warn(
          `Rate limit encountered. Waiting for ${delay / 1000} seconds before next attempt.`
        )
      }
    }

    if (retries > 0) {
      // If the function fails, wait for the delay then retry
      await new Promise((resolve) => setTimeout(resolve, delay))
      return retryOnFail(fn, retries - 1, delay)
    } else {
      // If we've run out of retries, throw the error
      throw error
    }
  }
}
