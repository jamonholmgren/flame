import { filesystem, print } from 'gluegun'
import { Message, SmartContext } from '../types'
import { mostRelevantFiles } from './mostRelevantFiles'

const FILE_LENGTH_LIMIT = 1000 * 3 // characters * 3 = tokens (roughly)
const TOTAL_FILE_LENGTH_LIMIT = 5000 * 3 // characters * 3 = tokens (roughly)

export async function createSmartContextBackchat(context: SmartContext): Promise<Message[]> {
  // This function will provide the backchat for the interactive.ts command,
  // carefully tuned for the current context.

  const backchat: Message[] = []

  let smartContextDescription = ``

  // we'll start with the main project information
  if (context.project) {
    backchat.push({
      content: context.project,
      role: 'user',
    })
    smartContextDescription += 'project • '
  }
  // let's fetch the most relevant files, using the embeddings
  const relevantFiles = mostRelevantFiles(context, 0.7)

  // then we'll add a list of all the files we know about
  const paths = Object.keys(context.files)
  if (paths.length > 0) {
    const pathsWithRelevancy = paths
      .map((p) => {
        const rel = Math.floor(relevantFiles.find((f) => f.file.path === p)?.similarity * 100)
        if (!rel) return
        return { content: `${p} (${rel}%)`, rel }
      })
      .filter((p) => p)
      .sort((a, b) => b.rel - a.rel)
      .map((p) => p.content)

    backchat.push({
      content: `These are the files that seem relevant to the current task (and % relevant):\n${pathsWithRelevancy.join(
        '\n'
      )}`,
      role: 'user',
    })
    smartContextDescription += `file list (${paths.length}) • `
  }

  let totalFileCharacterCount = 0

  // let's add all the most relevant files up to the limit
  const relevantFilesToUse = relevantFiles.filter((f) => {
    totalFileCharacterCount += Math.min(f.file.length, FILE_LENGTH_LIMIT)
    return totalFileCharacterCount < TOTAL_FILE_LENGTH_LIMIT
  })

  // then we'll add the previous messages that are relevant to the current task
  if (context.messages.length > 1) {
    // currently, just the 9 previous messages, not counting the current one
    const messages = context.messages.slice(-10, -1)

    for (const message of messages) {
      backchat.push(message)

      // if it's not a readFileAndReportBack function, we're done
      const isReadFile = message.role === 'assistant' && message.function_call?.name === 'readFileAndReportBack'
      if (!isReadFile) continue

      // we have a file read function, so we'll add the file contents ... if relevant to the current task
      const filepath = JSON.parse(message.function_call.arguments).path
      const file = context.files[filepath]

      // check if it's one of the relevant files we have budget to show
      const relevantFile = relevantFilesToUse.find((f) => f.file.path === filepath)

      if (file && relevantFile) {
        // if it's a relevant file, we'll add the contents
        const content = await filesystem.readAsync(filepath)

        // no file?
        if (!content) {
          // delete from relevant files
          relevantFilesToUse.splice(relevantFilesToUse.indexOf(relevantFile), 1)

          // remove it from the context too
          delete context.files[filepath]

          continue
        }

        backchat.push({
          role: 'function',
          name: 'readFileAndReportBack',
          content,
        })

        // can remove the file from the relevant files, since we've already added it
        relevantFilesToUse.splice(relevantFilesToUse.indexOf(relevantFile), 1)

        // add the character count to the total
        totalFileCharacterCount += content.length
      } else {
        // if it's not a file we know about or not relevant, we'll just add the message
        const rel = relevantFiles.find((f) => f.file.path === filepath)?.similarity

        backchat.push({
          role: 'function',
          name: 'readFileAndReportBack',
          content: `(file contents omitted -- ${rel ? `not relevant enough (${rel})` : `not enough room`})`,
        })
      }
    }

    smartContextDescription += `${messages.length + 1} previous messages • `
  }

  if (relevantFilesToUse.length > 0) {
    // show any other relevant files we have budget to show and which haven't been shown yet
    for (let [i, { file, similarity }] of relevantFilesToUse.entries()) {
      let fileContent = await filesystem.readAsync(file.path)

      // truncate individual files if over FILE_LENGTH_LIMIT
      if (fileContent.length > FILE_LENGTH_LIMIT) {
        fileContent = `${fileContent.slice(0, FILE_LENGTH_LIMIT)}\n\n... (truncated)`
      }

      backchat.push({
        role: 'assistant',
        content: null,
        function_call: {
          name: 'readFileAndReportBack',
          arguments: JSON.stringify({ path: file.path }),
        },
      })

      backchat.push({
        role: 'function',
        name: 'readFileAndReportBack',
        content: fileContent,
      })

      smartContextDescription += `${file.path.split('/').slice(-1)[0]} • `
    }
  }

  // then we'll add the current task
  if (context.currentTask) {
    backchat.push({
      content: `Just as context: the task we've been working on is: ${context.currentTask}\n(please help me update the current task description if this is not accurate based on context!)`,
      role: 'user',
    })

    smartContextDescription += `current task • `
  }

  // then we'll add the most recent message, which is most important
  if (context.messages.length > 0) {
    const messages = context.messages.slice(-1)

    messages.forEach((message) => {
      backchat.push(message)
    })

    smartContextDescription += `most recent message • `
  }

  print.info(print.colors.gray(`\nSending: ${smartContextDescription}...\n`))

  return backchat
}
