import { listFiles } from '../../src/utils/listFiles'
import type { SmartContext, ListFilesOptions } from '../../src/types'

const fakeContext: SmartContext = {
  project: 'test project',
  currentTask: 'test task',
  files: {},
  messages: [],
  workingFolder: process.cwd() + '/__tests__/testapp',
  currentFile: undefined,
}

describe('listFiles', () => {
  let options: ListFilesOptions
  const testappPath = '.'

  it('lists files in a given path and adds them to the context', async () => {
    const context: SmartContext = { ...fakeContext }

    const result = await listFiles(testappPath, context, { recursive: false, ignore: [] })

    expect(result).toEqual(['README.md', 'app.json', 'package.json', 'src/'])
    expect(context.files).toEqual({
      'README.md': { path: 'README.md' },
      'app.json': { path: 'app.json' },
      'package.json': { path: 'package.json' },
      'src/': { path: 'src/' },
    })
  })

  it('lists files recursively if the recursive option is true', async () => {
    const context: SmartContext = { ...fakeContext }

    const result = await listFiles(testappPath, context, { recursive: true, ignore: [] })

    expect(result).toEqual(['README.md', 'app.json', 'package.json', 'src/', 'src/app.mjs'])
    expect(context.files).toEqual({
      'README.md': { path: 'README.md' },
      'package.json': { path: 'package.json' },
      'app.json': { path: 'app.json' },
      'src/': { path: 'src/' },
      'src/app.mjs': { path: 'src/app.mjs' },
    })
  })
})
