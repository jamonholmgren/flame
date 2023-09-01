import type { FileData } from '../types'
import { print, prompt } from 'gluegun'

export async function retryGetAdvice(fileData: FileData) {
  const { gray } = print.colors

  print.info('⇾ Any advice to help me convert this file better?')

  fileData.customPrompts.forEach((i) => print.info(gray(`   ${i}\n`)))

  const nextInstructionsQuestion = await prompt.ask({ type: 'input', name: 'nextInstructions', message: 'Prompt' })
  const nextInstructions = nextInstructionsQuestion.nextInstructions

  print.info('\n')

  // typing "exit" always gets out of the CLI immediately
  if (nextInstructions === 'exit') process.exit(0)

  if (nextInstructions?.trim().length > 0) fileData.customPrompts.push(nextInstructions)
  fileData.change = 'pending'
}
