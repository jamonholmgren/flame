// Helper functions for handling chat history

import { filesystem } from 'gluegun'
import type { SmartContext } from '../../types'

// Load chat history from a file
export async function loadChatHistory(workingFolder: string): Promise<SmartContext> {
  const chatHistoryFile = `${workingFolder}/.config/flame/flame-history.json`

  // make sure the folder exists
  await filesystem.dirAsync(`${workingFolder}/.config/flame`)

  const context: SmartContext = {
    tasks: [],
    files: [],
    messages: [],
  }

  // read the chat context
  const chatHistory = await filesystem.readAsync(chatHistoryFile, 'utf8')

  // if there is chat history, parse it
  if (chatHistory) {
    const parsedChatHistory = JSON.parse(chatHistory)

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
export async function saveChatHistory(workingFolder: string, context: SmartContext): Promise<void> {
  const chatHistoryFile = `${workingFolder}/.config/flame/flame-history.json`

  // make sure the folder exists
  await filesystem.dirAsync(`${workingFolder}/.config/flame`)

  // write the chat history
  await filesystem.writeAsync(chatHistoryFile, JSON.stringify(context))
}
