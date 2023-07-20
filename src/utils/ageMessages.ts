import { Message } from '../types'

// Helper function to calculate the total length of all messages, including function calls
function calcLength(messages: any[]) {
  return messages.reduce(
    (sum, msg) => sum + (msg.content?.length || 0) + (msg.function_call?.arguments?.length || 0),
    0
  )
}

export function ageMessages(allMessages: Message[], maxLength = 12000) {
  // Separate the last three messages
  const lastThreeMessages = allMessages.slice(-3)
  let messages = allMessages.slice(0, -3)

  // Calculate the total length of all messages
  let totalLength = calcLength(messages)

  // Check if the total length is more than 8000
  while (totalLength > maxLength) {
    // Age the messages
    let somethingAged = false
    messages = messages
      .map((msg) => {
        if (msg.age !== undefined) {
          somethingAged = true
          msg.age--

          // important messages don't get aged out or truncated
          if (msg.importance === 'important') return msg

          if ((msg.importance === 'optional' && msg.age <= 0) || (msg.importance === 'normal' || !msg.importance) && msg.age <= 20) {
            // empty out the message, going to be deleted totally
            msg.content = ''
            msg.function_call = undefined
            return msg
          }

          if (msg.content) {
            // If age is <= 5, cut the content in half
            if (msg.age <= 5) {
              msg.content = msg.content.slice(0, msg.content.length / 2) + '...<omitted>'

              // If age is <= 5, also edit the function_call arguments to truncate in half
              const args = msg?.function_call?.arguments
              if (msg.age <= 0 && args && args.length > 0) {
                msg.function_call.arguments = args.slice(0, args.length / 2) + '...<omitted>'
              }
            }

            // If age is <= 0, edit the content to truncate to 20 characters
            if (msg.age <= 0) {
              msg.content = msg.content.slice(0, 20) + '...<omitted>'
            }
          }

          if (msg.function_call) {
            // If age is <= 0, also edit the function_call instructions
            if (msg.age <= 0 && msg.function_call?.arguments?.length > 0) {
              msg.function_call.arguments = '...<omitted>'
            }
          }
        }

        return msg
      })
      // filter out any messages that are empty
      .filter((msg) => msg.content || msg.function_call)

    // Recalculate the total length
    totalLength = calcLength(messages)

    // If nothing was aged, break out of the loop
    if (!somethingAged) break
  }

  return [...messages, ...lastThreeMessages]
}
