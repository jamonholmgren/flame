import { print } from 'gluegun'

/**
 * Takes a diff and color codes the lines gray (no change), green (added), and red (removed).
 */
export function coloredDiff(fileDiff: string): string {
  const { green, red, gray } = print.colors

  // color code the diff
  const diffLines = fileDiff.split('\n')
  return diffLines
    .map((line) => {
      if (['---', '+++', 'index'].includes(line.split(' ')[0])) {
        // ignore
      } else if (line.startsWith('+')) {
        return green(line)
      } else if (line.startsWith('-')) {
        return red(line)
      } else {
        return gray(line)
      }
    })
    .filter((line) => line)
    .join('\n')
}
