import * as readline from 'readline'

export async function prompt(question: string) {
  return new Promise((resolve: (ans: string) => void, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question(question, (answer: string) => {
      rl.close()
      resolve(answer)
    })
  })
}
