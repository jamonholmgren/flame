// Helper functions for handling chat history

import { filesystem } from 'gluegun'
import type { SessionContext } from '../../types'

const flamePath = '.config/flame'
const flameFile = `flame-data.json`

// Load chat history from a file
export async function loadContext(context: SessionContext) {
  const path = `${context.cwd}/${flamePath}`

  // make sure the flame config folder exists
  await filesystem.dirAsync(path)

  // read the chat context
  const flameData = await filesystem.readAsync(`${path}/${flameFile}`, 'utf8')

  // if there is chat history, parse it
  if (flameData) {
    const parsedChatHistory = JSON.parse(flameData)

    // load the context from it
    Object.assign(context, parsedChatHistory)
  }
}

// Save chat history to a file
export async function saveContext(context: SessionContext) {
  const path = filesystem.path(`${context.cwd}/${flamePath}`)

  // make sure the folder exists
  await filesystem.dirAsync(path)

  // write the context
  await filesystem.writeAsync(`${path}/${flameFile}`, JSON.stringify(context, null, 2))
}
