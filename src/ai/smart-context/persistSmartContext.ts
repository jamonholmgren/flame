// Helper functions for handling chat history

import { filesystem } from 'gluegun'
import type { SmartContext } from '../../types'

const flamePath = '.config/flame'
const flameFile = `flame-data.json`

// Load chat history from a file
export async function loadSmartContext(workingFolder: string): Promise<SmartContext> {
  const path = `${workingFolder}/${flamePath}`

  // make sure the folder exists
  await filesystem.dirAsync(path)

  const context: SmartContext = {
    project: '',
    tasks: [],
    files: [],
    messages: [],
  }

  // read the chat context
  const flameData = await filesystem.readAsync(`${path}/${flameFile}`, 'utf8')

  // if there is chat history, parse it
  if (flameData) {
    const parsedChatHistory = JSON.parse(flameData)

    if (Array.isArray(parsedChatHistory)) {
      // if the chat history is an array, upgrade it to an object
      context.messages = parsedChatHistory
    } else {
      // if it's an object, load the context from it
      context.tasks = parsedChatHistory.tasks
      context.files = parsedChatHistory.files
      context.messages = parsedChatHistory.messages
    }
  }

  return context
}

// Save chat history to a file
export async function saveSmartContext(workingFolder: string, context: SmartContext) {
  const path = `${workingFolder}/${flamePath}`

  // make sure the folder exists
  await filesystem.dirAsync(path)

  // write the context
  await filesystem.writeAsync(`${path}/${flameFile}`, JSON.stringify(context))
}
