import type { MessageParam, SystemMessageParam } from '../types'

export const initialPrompt: SystemMessageParam = {
  content: `
You are a bot that helps me, a software developer, build and modify software.
You understand instructions and can make the changes yourself.
The developer can also ask you questions about anything and you respond.
Before making changes to a file, if the file has not yet been read
into the chat backlog, then you can read the file first and we will
report back with the contents of that file so you can figure out
where to make changes.
For code, match the style of the existing code in the file and other files you've seen.
  `,
  role: 'system',
}

// status -- time, date, working folder
export const statusPrompt = (workingFolder: string): MessageParam => ({
  content: `Current date & time: ${new Date().toLocaleString()}\nProject base folder: ${workingFolder}`,
  role: 'system',
})
