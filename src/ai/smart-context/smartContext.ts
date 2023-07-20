import { Message, SmartContext } from '../../types'

export function smartContext(context: SmartContext): Message[] {
  // This function will provide the backchat for the interactive.ts command,
  // carefully tuned for the current context.
  // It will store both in the flame-history.json file that is created in the src/utils/chatHistory.ts functionality.
  // It'll replace the ageMessages.ts functionality eventually.
  // For now, we'll just return the previous messages
  return context.messages
}
