import type { FileData } from '../types'
import { prompt } from 'gluegun'

export async function skipOrUpgradeMenu(fileData: FileData): Promise<{ next: 'skip' | 'upgrade' | 'exit' }> {
  let skipFile = 'upgrade'
  const skipAnswer = await prompt.ask({
    type: 'select',
    name: 'skipFile',
    message: 'Do you want to upgrade this file?',
    choices: [
      { message: `Start upgrading ${fileData.path}`, name: 'upgrade' },
      { message: 'Skip this file', name: 'skip' },
      { message: 'Exit', name: 'exit' },
    ],
  })

  skipFile = skipAnswer['skipFile']

  if (skipFile === 'skip') {
    fileData.change = 'skipped'
    return { next: 'skip' }
  } else if (skipFile === 'exit') {
    return { next: 'exit' }
  }

  return { next: 'upgrade' }
}
