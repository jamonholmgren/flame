import { filesystem } from 'gluegun'
import type { SessionContext } from '../../types'
import { ChatCompletionFunctionMessageParam } from 'openai/resources'

export async function loadFile(fileName: string) {
  const path = filesystem.path(fileName)

  // read the file
  const contents = await filesystem.readAsync(path, 'utf8')

  // if there is no file, return undefined
  if (!contents) return undefined

  // return the file contents
  return { contents }
}
