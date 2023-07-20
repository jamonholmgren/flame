// Helper function to calculate the total length of all messages
function calcLength(messages: any[]) {
  return messages.reduce((sum, msg) => sum + msg.content.length, 0)
}

export function ageMessages(messages: any[], maxLength = 8000) {
  // Calculate the total length of all messages
  let totalLength = calcLength(messages)

  // Check if the total length is more than 8000
  while (totalLength > maxLength) {
    // Age the messages
    let somethingAged = false
    messages = messages.map((msg) => {
      if (msg.age !== undefined && msg.age > 0) {
        somethingAged = true
        msg.age--

        // If age is <= 0, edit the content to truncate
        if (msg.age <= 0) {
          msg.content = msg.content.slice(20) + '...<rest omitted for brevity>'
        }
      }

      return msg
    })

    // Recalculate the total length
    totalLength = calcLength(messages)

    // If nothing was aged, break out of the loop
    if (!somethingAged) break
  }

  return messages
}
