import { system, filesystem } from 'gluegun'

const src = filesystem.path(__dirname, '..')

const cli = async (cmd) => system.run('node ' + filesystem.path(src, 'bin', 'flame') + ` ${cmd}`)

test('outputs version', async () => {
  const version = require('../package.json').version
  expect(version).toContain('.') // sanity check
  const output = await cli('--version')
  expect(output).toContain(version)
})

test('outputs help', async () => {
  const version = require('../package.json').version
  expect(version).toContain('.') // sanity check

  const output = await cli('--help')
  expect(output).toContain(version)
})
