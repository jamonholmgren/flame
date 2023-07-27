import { print } from 'gluegun'
import { Message, SmartContext } from '../../types'
import { cosineSimilarity } from '../../utils/cosignSimilarity'
import { loadFile } from '../../utils/loadFile'

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

  const paths = Object.keys(context.files)
  if (paths.length > 0) {
    // then we'll add a list of all the files we know about
    backchat.push({
      content: `We know about these files and folders so far:\n${paths.join('\n')}`,
      role: 'user',
    })
    smartContextDescription += `file list (${paths.length}) • `
  }

  // let's add any relevant files, using the embeddings
  if (Object.keys(context.files).length > 0 && context.currentTaskEmbeddings) {
    const relevantFiles = Object.values(context.files)
      .map((file) => {
        // if it's the currentFile, skip it -- we'll add it later
        if (file.path === context.currentFile) return { file, similarity: 0 }

        // check its relevancy
        if (file.embeddings) {
          // if it has embeddings, we'll check the cosine similarity
          const similarity = cosineSimilarity(context.currentTaskEmbeddings, file.embeddings)
          return { file, similarity }
        } else {
          return { file, similarity: 0 }
        }
      })
      .filter((a) => a.similarity > 0.7) // has to be > 70% or we don't show it
      .sort((a, b) => b.similarity - a.similarity)

    if (relevantFiles.length > 0) {
      // grab the first 3 most relevant files
      relevantFiles.slice(0, 3).forEach(({ file, similarity }) => {
        backchat.push({
          role: 'assistant',
          content: null,
          function_call: {
            name: 'readFileAndReportBack',
            arguments: JSON.stringify({ path: file.path }),
          },
        })

        // the very first file, if it's really high relevancy, we'll use the full contents
        const content =
          file === relevantFiles[0].file && similarity > 0.9
            ? file.contents
            : file.shortened || file.contents // or shortened version for less relevant files

        backchat.push({
          role: 'function',
          name: 'readFileAndReportBack',
          content,
        })

        smartContextDescription += `${file.path.split('/').slice(-1)[0]} • `
      })
    }
  }

  // then we'll add the current task
  if (context.currentTask) {
    backchat.push({
      content: `The task we've been working on is: ${context.currentTask}\n(please update current task if not accurate)`,
      role: 'user',
    })

    smartContextDescription += `current task • `
  }

  // then we'll add the previous messages that are relevant to the current task
  if (context.messages.length > 1) {
    // currently, just the 9 previous messages, not counting the current one
    const messages = context.messages.slice(-10, -1)

    messages.forEach((message) => {
      backchat.push(message)
    })

    smartContextDescription += `${messages.length + 1} previous messages • `
  }

  // then we'll add the current (last-loaded) file
  if (context.currentFile) {
    // refresh it from the filesystem to get the latest version
    const file = await loadFile(context.currentFile, context)

    // if we have a current file, we'll add it to the backchat as if we just read it in a function call
    if (file && file.contents) {
      backchat.push({
        role: 'assistant',
        content: null,
        function_call: {
          name: 'readFileAndReportBack',
          arguments: JSON.stringify({ path: context.currentFile }),
        },
      })

      // if the file.contents length < 8000, use that
      // otherwise, just use the first 8000 characters
      const content =
        file.contents.length < 8000
          ? file.contents
          : file.contents.slice(0, 8000) + '\n(...rest of file omitted for brevity)'

      backchat.push({
        role: 'function',
        name: 'readFileAndReportBack',
        content,
      })

      smartContextDescription += `${context.currentFile.split('/').slice(-1)[0]} • `
    }
  }

  // then we'll add the most recent message
  if (context.messages.length > 0) {
    // currently, just the most recent message
    const messages = context.messages.slice(-1)

    messages.forEach((message) => {
      backchat.push(message)
    })

    smartContextDescription += `most recent message • `
  }

  print.info(print.colors.gray(`\nSending: ${smartContextDescription}...\n`))

  return backchat
}
