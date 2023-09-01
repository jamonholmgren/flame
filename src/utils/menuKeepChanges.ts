import { print, prompt, filesystem } from 'gluegun'
import type { FileData } from '../types'
import type { ChatCompletionFunctionResult } from '../types'
import { deleteCachedResponse } from './persistCache'
import { coloredDiff } from './coloredDiff'

type KeepChangesOptions = {
  result: ChatCompletionFunctionResult
  options: { cacheFile?: string }
  fileData: FileData
}

type KeepChangesResult = 'next' | 'retry' | 'changes' | 'diff' | 'removeCache' | 'skip' | 'keepExit' | 'undoExit'

export async function menuKeepChanges({ result, fileData, options }: KeepChangesOptions) {
  if (result.changes.split('\n').length === 0) {
    print.info(`⇾ No changes made to file.\n`)
  } else if (result.changes.split('\n').length <= 30) {
    print.info(result.changes + '\n')
  } else {
    print.info(`⇾ Many changes made to file -- choose "See all changes" to see them.`)
    print.info(`  Or check your code editor (probably easier)\n`)
  }
  print.info('\n')

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
      print.info('\n' + coloredDiff(fileData.diff) + '\n')
      continue
    }

    break
  }

  return keepChanges
}
