import { filesystem } from 'gluegun'
import { FileData } from './parseGitDiff'
import { ChatCompletionResponseMessage } from 'openai'

export async function saveCachedResponse(
  cacheFile: string,
  fileData: FileData,
  aiResponse: ChatCompletionResponseMessage
) {
  // load the existing cache file
  const cacheData = (await filesystem.readAsync(cacheFile, 'json')) || { request: {} }

  // add the request and response to the cache file
  cacheData.request[fileData.path] = aiResponse

  // write it back
  await filesystem.writeAsync(cacheFile, cacheData, { jsonIndent: 2 })
}

export async function loadCachedResponse(
  cacheFile: string,
  fileData: FileData
): Promise<ChatCompletionResponseMessage> {
  // load the existing cache file
  const cacheData = (await filesystem.readAsync(cacheFile, 'json')) || { request: {} }
  // check if a recording for this request exists
  return cacheData.request[fileData.path]
}

export async function deleteCachedResponse(cacheFile: string, fileData: FileData) {
  // load the existing cache file
  const cacheData = (await filesystem.readAsync(cacheFile, 'json')) || { request: {} }
  // remove the request and response to the cache file
  delete cacheData.request[fileData.path]
  // write it back
  await filesystem.writeAsync(cacheFile, cacheData, { jsonIndent: 2 })
}
