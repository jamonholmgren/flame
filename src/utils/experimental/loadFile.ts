import { filesystem } from 'gluegun'

export async function loadFile(fileName: string) {
  const path = filesystem.path(fileName)

  console.log('Loading file: ' + path)

  // read the file
  const contents = await filesystem.readAsync(path, 'utf8')

  // if there is no file, return undefined
  if (!contents) return undefined

  // return the file contents
  return { contents }
}
