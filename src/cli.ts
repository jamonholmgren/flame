import { build } from 'gluegun'

/**
 * Create the cli and kick it off
 */
async function run(argv) {
  // create a CLI runtime
  const cli = build()
    .brand('flame')
    .src(__dirname)
    .help() // provides default for help, h, --help, -h
    .version() // provides default for version, v, --version, -v
    .exclude([
      // 'meta',
      'strings',
      // 'print',
      // 'filesystem',
      'semver',
      // 'system',
      // 'prompt',
      // 'http',
      'template',
      // 'patching',
      'package-manager',
    ])
    .create()
  const toolbox = await cli.run(argv)

  // send it back (for testing, mostly)
  return toolbox
}

module.exports = { run }
