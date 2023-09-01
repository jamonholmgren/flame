import type { FileData } from '../types'
import { print } from 'gluegun'
import { br, hr } from './printing'

export function summarize(summary: FileData[]) {
  const { bold, white, gray } = print.colors
  const created = summary.filter((f) => f.change === 'created')
  const modified = summary.filter((f) => f.change === 'modified')
  const deleted = summary.filter((f) => f.change === 'deleted')
  const skipped = summary.filter((f) => f.change === 'skipped')
  const ignored = summary.filter((f) => f.change === 'ignored')
  const pending = summary.filter((f) => f.change === 'pending')
  const errors = summary.filter((f) => f.error)

  hr()
  print.info(bold(white(`Summary\n`)))

  print.info(`Created: ${created.length}`)
  created.forEach((f) => print.info(`   ${f.path}`))
  br()

  print.info(`Modified: ${modified.length}`)
  modified.forEach((f) => print.info(`   ${f.path}`))
  br()

  print.info(`Deleted: ${deleted.length}`)
  deleted.forEach((f) => print.info(`   ${f.path}`))
  br()

  print.info(`Skipped: ${skipped.length}`)
  skipped.forEach((f) => print.info(`   ${f.path}`))
  br()

  print.info(`Ignored: ${ignored.length}`)
  ignored.forEach((f) => print.info(`   ${f.path}`))
  br()

  print.info(`Pending: ${pending.length}`)
  pending.forEach((f) => print.info(`   ${f.path}`))
  br()

  print.info(`Errors: ${errors.length}`)
  errors.forEach((f) => print.info(`   ${f.path} (${f.error})`))

  hr()

  print.info(bold(white(`Custom prompts:`)))
  summary.forEach((f) => {
    if (f.customPrompts.length > 0) {
      print.info(`   ${f.path}`)
      // print the prompts
      f.customPrompts.forEach((p) => print.info(gray(`      ${p}`)))
    }
  })
}
