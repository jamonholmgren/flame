import { filesystem } from 'gluegun'

export async function saveCachedResponse<T>(cacheFile: string, cacheKey: string, response: T) {
  // load the existing cache file
  const cacheData = (await filesystem.readAsync(cacheFile, 'json')) || { request: {} }

  // add the request and response to the cache file
  cacheData.request[cacheKey] = response

  // write it back
  await filesystem.writeAsync(cacheFile, cacheData, { jsonIndent: 2 })
}

export async function loadCachedResponse<T>(cacheFile: string, cacheKey: string): Promise<T> {
  // load the existing cache file
  const cacheData = (await filesystem.readAsync(cacheFile, 'json')) || { request: {} }
  // check if a recording for this request exists
  return cacheData.request[cacheKey]
}

export async function deleteCachedResponse(cacheFile: string, cacheKey: string) {
  // load the existing cache file
  const cacheData = (await filesystem.readAsync(cacheFile, 'json')) || { request: {} }
  // remove the request and response to the cache file
  delete cacheData.request[cacheKey]
  // write it back
  await filesystem.writeAsync(cacheFile, cacheData, { jsonIndent: 2 })
}
