import { filesystem, print } from 'gluegun'
import { Message, SmartContext } from '../../types'
import { cosineSimilarity } from '../../utils/cosignSimilarity'
import { mostRelevantFiles } from '../../utils/mostRelevantFiles'

const FILE_LENGTH_LIMIT = 2000 * 3 // characters * 3 = tokens (roughly)
const TOTAL_FILE_LENGTH_LIMIT = 4000 * 3 // characters * 3 = tokens (roughly)

export async function createSmartContextBackchat(context: SmartContext): Promise<Message[]> {
  // This function will provide the backchat for the interactive.ts command,
  // carefully tuned for the current context.
  // It will store both in the flame-history.json file that is created in the src/utils/chatHistory.ts functionality.
  // It'll replace the ageMessages.ts functionality eventually.
  // For now, we'll just return the previous messages
  // return context.messages

  // a good backchat will include:
  // - what the project is all about
  // - what the current task is
  // - the most relevant file(s) to the current task
  // - previous messages that are relevant to the current task
  // - the current file
  // - the most recent message

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

  // then we'll add a list of all the files we know about
  const paths = Object.keys(context.files)
  if (paths.length > 0) {
    backchat.push({
      content: `We know about these files and folders so far:\n${paths.join('\n')}`,
      role: 'user',
    })
    smartContextDescription += `file list (${paths.length}) • `
  }

  // then we'll add the current task
  if (context.currentTask) {
    backchat.push({
      content: `The task we've been working on is: ${context.currentTask}\n(please update current task if not accurate)`,
      role: 'user',
    })

    smartContextDescription += `current task • `
  }

  let totalFileCharacterCount = 0

  // let's fetch the most relevant files, using the embeddings
  const relevantFiles = mostRelevantFiles(context, 0.8)

  // then we'll add the previous messages that are relevant to the current task
  if (context.messages.length > 1) {
    // currently, just the 9 previous messages, not counting the current one
    const messages = context.messages.slice(-10, -1)

    for (const message of messages) {
      if (!message.function_call || message.function_call?.name !== 'readFileAndReportBack') {
        backchat.push(message)
        continue
      }

      // we have a file read function, so we'll add the file contents ... if relevant to the current task
      const filepath = JSON.parse(message.function_call.arguments).path
      const file = context.files[filepath]
      // check if it's a relevant file (above 80%)
      const relevantFile = relevantFiles.find((f) => f.file.path === filepath)
      if (file && relevantFile) {
        // if it's a relevant file, we'll add the contents
        const content = await filesystem.readAsync(filepath)
        backchat.push({
          role: 'function',
          name: 'readFileAndReportBack',
          content,
        })

        // can remove the file from the relevant files, since we've already added it
        relevantFiles.splice(relevantFiles.indexOf(relevantFile), 1)

        // add the character count to the total
        totalFileCharacterCount += content.length
      } else {
        // if it's not a file we know about or not relevant, we'll just add the message
        backchat.push({
          role: 'function',
          name: 'readFileAndReportBack',
          content: `(file contents omitted -- not relevant?)`,
        })

        // add a bit of character count to the total
        totalFileCharacterCount += 100
      }
    }

    smartContextDescription += `${messages.length + 1} previous messages • `
  }

  if (relevantFiles.length > 0) {
    // grab the most relevant files up to the token limit
    // relevantFiles.slice(0, 3).forEach(({ file, similarity }) => {
    // for version
    for (let [i, { file, similarity }] of relevantFiles.slice(0, 10).entries()) {
      let fileContent = await filesystem.readAsync(file.path)

      // truncate individual files if over FILE_LENGTH_LIMIT
      if (fileContent.length > FILE_LENGTH_LIMIT) {
        fileContent = `${fileContent.slice(0, FILE_LENGTH_LIMIT)}\n\n... (truncated)`
      }

      // if the total file character count is already over the total limit, we'll just add the file path
      if (totalFileCharacterCount > TOTAL_FILE_LENGTH_LIMIT) {
        backchat.push({
          role: 'user',
          content: `The file ${
            file.path.split('/').slice(-1)[0]
          } might be relevant, but we're over the character count and it's ${
            file.length
          } characters long.`,
        })
      } else {
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

        // add the character count to the total
        totalFileCharacterCount += fileContent.length
      }
      smartContextDescription += `${file.path.split('/').slice(-1)[0]} • `
    }
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
