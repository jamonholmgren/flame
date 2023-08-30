import { print } from 'gluegun'

const { red, gray, white } = print.colors

export function flame() {
  print.info(
    red(`
    🔥🔥🔥  
    |  __| _🔥                      🔥_🔥   🔥🔥
    | |_  | | 🔥__  🔥🔥   🔥_🔥     / \\   |_ _|  
    | __| | |/ _\` || '  \\🔥/ -_)   🔥 _ \\   | |   
    |_|   |_|\\__,_||_|_|_| \\___|   /_/ \\_\\ |___|             
    `)
  )
}

export function info(label: string, content: string) {
  print.info(`🔥 ${gray(label.padEnd(8))} ${white(content)}`)
}

export function br() {
  print.info('')
}

export function hr() {
  print.info('\n' + '─'.repeat(51) + '\n')
}
