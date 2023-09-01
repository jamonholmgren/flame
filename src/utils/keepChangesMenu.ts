import { print, prompt, filesystem } from 'gluegun'
import type { FileData } from '../types'
import type { ChatCompletionFunctionResult } from '../types'
import { deleteCachedResponse } from './persistCache'

type KeepChangesOptions = {
  result: ChatCompletionFunctionResult
  options: { cacheFile?: string }
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
        { name: 'next', message: 'Looks good! Next file please' },
        { name: 'retry', message: 'Try again (and ask me for advice)' },
        { name: 'changes', message: 'See all changes to file' },
        { name: 'diff', message: 'See original diff again' },
        ...(options.cacheFile ? [{ name: 'removeCache', message: 'Remove cache for this file' }] : []),
        { name: 'skip', message: 'Skip this file (undo changes)' },
        { name: 'keepExit', message: 'Exit (keep changes to this file)' },
        { name: 'undoExit', message: 'Exit (undo changes to this file)' },
      ],
    })

    keepChanges = keepChangesQuestion.keepChanges as KeepChangesResult

    if (keepChanges === 'removeCache') {
      await deleteCachedResponse(options.cacheFile, fileData.path)
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
