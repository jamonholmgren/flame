import { print, prompt, filesystem } from 'gluegun'
import type { FileData } from '../utils/parseGitDiff'
import type { ChatCompletionFunctionResult } from '../types'

type KeepChangesOptions = {
  result: ChatCompletionFunctionResult
  options: {
    cacheFile?: string
  }
  fileData: FileData
}

type KeepChangesResult = 'next' | 'retry' | 'changes' | 'diff' | 'removeCache' | 'skip' | 'keepExit' | 'undoExit'

export async function keepChangesMenu({ result, fileData, options }: KeepChangesOptions) {
  let keepChanges: KeepChangesResult = undefined
  while (true) {
    const keepChangesQuestion = await prompt.ask({
      type: 'select',
      name: 'keepChanges',
      message: 'Review the changes and let me know what to do next!',
      choices: [
        { message: 'Looks good! Next file please', name: 'next' },
        { message: 'Try again (and ask me for advice)', name: 'retry' },
        { message: 'See all changes to file', name: 'changes' },
        { message: 'See original diff again', name: 'diff' },
        ...(options.cacheFile ? [{ message: 'Remove cache for this file', name: 'removeCache' }] : []),
        { message: 'Skip this file (undo changes)', name: 'skip' },
        { message: 'Exit (keep changes to this file)', name: 'keepExit' },
        { message: 'Exit (undo changes to this file)', name: 'undoExit' },
      ],
    })

    keepChanges = keepChangesQuestion.keepChanges as KeepChangesResult

    if (keepChanges === 'removeCache') {
      // load the existing cache file
      const demoData = (await filesystem.readAsync(options.cacheFile, 'json')) || { request: {} }
      // remove the request and response to the demo file
      delete demoData.request[fileData.path]
      // write it back
      await filesystem.writeAsync(options.cacheFile, demoData, { jsonIndent: 2 })
      print.info(`\n↺  Cache removed for ${fileData.path}.\n`)
      continue
    }

    if (keepChanges === 'changes') {
      print.info('\n' + result.changes + '\n')
      continue
    }

    if (keepChanges === 'diff') {
      print.info('\n' + print.colors.gray(fileData.diff) + '\n')
      continue
    }

    break
  }

  return keepChanges
}
