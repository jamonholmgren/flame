// Helper functions for handling chat history

import { filesystem } from 'gluegun'
import { ChatCompletionRequestMessage } from 'openai'

type Message = ChatCompletionRequestMessage & {
  age?: number
}

// Load chat history from a file
export async function loadChatHistory(workingFolder: string): Promise<Message[]> {
  const chatHistoryFile = `${workingFolder}/.config/flame/flame-history.json`
  let prevMessages: Message[] = []

  // make sure the folder exists
  await filesystem.dirAsync(`${workingFolder}/.config/flame`)

  // read the chat history
  const chatHistory = await filesystem.readAsync(chatHistoryFile, 'utf8')

  // if there is chat history, parse it
  if (chatHistory) {
    const parsedChatHistory = JSON.parse(chatHistory)
    // add the chat history to the previous messages
    prevMessages.push(...parsedChatHistory)
  }

  return prevMessages
}

// Save chat history to a file
export async function saveChatHistory(
  workingFolder: string,
  prevMessages: Message[]
): Promise<void> {
  const chatHistoryFile = `${workingFolder}/.config/flame/flame-history.json`

  // make sure the folder exists
  await filesystem.dirAsync(`${workingFolder}/.config/flame`)

  // write the chat history
  await filesystem.writeAsync(chatHistoryFile, JSON.stringify(prevMessages))
}
