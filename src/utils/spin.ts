import { print } from 'gluegun'

let _spinner

export function spin(text: string) {
  if (!_spinner) {
    _spinner = print.spin(``)
  }
  _spinner.text = ` ${text}`
  _spinner.start()
}

export function done(text: string) {
  _spinner?.succeed(text)
}

export function stop(symbol: string, text: string) {
  _spinner?.stopAndPersist({
    symbol,
    text,
  })
}

export function error(text: string) {
  _spinner?.fail(text)
}

export function hide() {
  _spinner?.stop()
}
