// Helper function to calculate the total length of all messages
function calcLength(messages: any[]) {
  return messages.reduce((sum, msg) => sum + msg.content.length, 0)
}

export function ageMessages(messages: any[], maxLength = 12000) {
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

        // If age is <= 5, cut the content in half
        if (msg.age <= 5) {
          msg.content = msg.content.slice(0, msg.content.length / 2) + '...<rest omitted for brevity>'
        }

        // If age is <= 0, edit the content to truncate to 20 characters
        if (msg.age <= 0) {
          msg.content = msg.content.slice(0, 20) + '...<rest omitted for brevity>'
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
