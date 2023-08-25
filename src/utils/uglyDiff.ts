import { print } from 'gluegun'

/**
 * The ugliest diff code you've ever seen.
 *
 * It's horrifying. It's terrible. It's a crime against humanity.
 *
 * If anyone wants to replace this with something better, please do.
 *
 * Basically, it takes a file, and a string to replace, and a string to insert,
 * and returns a diff of the changes that will be made.
 *
 * Each change is colorized, and line numbers are added.
 *
 * It includes 3 lines before and after the change.
 *
 */
export function uglyDiff(file: string, fileContents: string, replace: string, insert: string) {
  const { red, green, gray } = print.colors

  // Store the changes that will be made as a diff
  // grab 3 lines before and after the detected "replace" string
  // (note it could be multiple lines, account for that)
  // first, find out where the replace string is index
  const replaceIndex = fileContents.indexOf(replace)

  // if it doesn't exist, report back that it doesn't exist
  if (replaceIndex === -1) {
    return { diff: `Could not find ${red(replace)} in ${file}`, replaceIndex }
  }

  // then, find the line number of that index
  const replaceLineNumber = fileContents.substring(0, replaceIndex).split('\n').length
  // then, split the file contents by lines
  const fileLines = fileContents.split('\n')
  // then, find out how long the replace string is
  const replaceLength = replace.split('\n').length
  // get the actual lines that will be replaced
  const replaceLines = fileLines.slice(replaceLineNumber - 1, replaceLineNumber + replaceLength)
  // then, grab the lines before and after the replace string, and add line numbers
  const beforeLines = fileLines
    .slice(replaceLineNumber - 4, replaceLineNumber - 1)
    .map((line, index) => gray(`${String(replaceLineNumber - 3 + index).padEnd(4)} ${line}`))
  const afterLines = fileLines
    .slice(replaceLineNumber + replaceLength, replaceLineNumber + replaceLength + 3)
    .map((line, index) => gray(`${String(replaceLineNumber + replaceLength + index + 1).padEnd(4)} ${line}`))
  // then, replace the replace string with the insert string (red + green colorized) and add line numbers
  // and concat the before and after lines
  const diff = [
    '\n',
    ...beforeLines,
    ...replaceLines.map((line) => `-    ${red(line)}`),
    ...replaceLines
      .join('\n')
      .replace(replace, insert)
      .split('\n')
      .map((line) => `+    ${green(line)}`),
    ...afterLines,
    '\n',
  ].join('\n')

  return { replaceIndex, diff }
}
