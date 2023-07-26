import { Message, SmartContext } from '../../types'

export function createSmartContextBackchat(context: SmartContext): Message[] {
  // This function will provide the backchat for the interactive.ts command,
  // carefully tuned for the current context.
  // It will store both in the flame-history.json file that is created in the src/utils/chatHistory.ts functionality.
  // It'll replace the ageMessages.ts functionality eventually.
  // For now, we'll just return the previous messages
  // return context.messages

  // a good backchat will include:
  // - what the project is all about
  // - what the current task is
  // - what other tasks we know about
  // - the most relevant file(s) to the current task
  // - previous messages that are relevant to the current task
  // - the most recent messages

  const backchat: Message[] = []

  // we'll start with the main project information
  if (context.project) {
    backchat.push({
      content: context.project,
      role: 'user',
    })
  }

  // we'll get the current task (currently, just the first task)
  const task = context.tasks[0]

  // then we'll add the other tasks we know about
  if (context.tasks.length > 1) {
    const otherTasks = context.tasks.slice(1)
    backchat.push({
      content: `We worked on these tasks: ${otherTasks.map((task) => task.name).join(', ')}`,
      role: 'user',
    })
  }

  // then we'll add the current task
  if (task) {
    const task = context.tasks[0]
    backchat.push({
      content: `The current task we are working on is ${task.name}: ${task.contents}`,
      role: 'user',
    })
  }

  const paths = Object.keys(context.files)
  if (paths.length > 0) {
    // then we'll add a list of all the files we know about
    backchat.push({
      content: `We know about these files and folders so far:\n${paths.join('\n')}`,
      role: 'user',
    })
  }

  // then we'll add the previous messages that are relevant to the current task
  if (context.messages.length > 5) {
    // currently, just the 5 messages before the 5 most recent messages
    const messages = context.messages.slice(-10, -5)

    messages.forEach((message) => {
      backchat.push(message)
    })
  }

  // then we'll add the most recent messages
  if (context.messages.length > 0) {
    // currently, just the 5 most recent messages
    const messages = context.messages.slice(-5)

    messages.forEach((message) => {
      backchat.push(message)
    })
  }

  // then we'll add the current file
  if (context.currentFile) {
    const file = context.files[context.currentFile]

    // if we have a current file, we'll add it
    if (file) {
      backchat.push({
        content: `The file for the current task is ${file.path}:\n\n${file.contents}`,
        role: 'user',
      })
    }
  }

  return backchat
}
