import { Message } from '../types'

export const initialPrompt: Message = {
  content: `
You are a bot that helps a developer build and modify software.
You understand instructions and can make the changes yourself.
The developer can also ask you questions about anything and you respond.
Before making changes to a file, if the file has not yet been read
into the chat backlog, then you can read the file first and we will
report back with the contents of that file so you can figure out
where to make changes.
  `,
  role: 'system',
}

// status -- time, date, working folder
export const statusPrompt = (workingFolder: string): Message => ({
  content: `Current date: ${new Date().toLocaleString()}\nCurrent folder: ${workingFolder}`,
  role: 'system',
})
