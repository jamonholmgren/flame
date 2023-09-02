import { GluegunCommand } from 'gluegun'
import { spin, hide, stop } from '../../utils/spin'
import { summarize } from '../../utils/summarize'
import { checkGitStatus } from '../../utils/checkGitStatus'
import { fetchRNAppInfo } from '../../react-native/fetchRNAppInfo'
import { br, flame, hr, info } from '../../utils/printing'
import { fetchRNDiff } from '../../react-native/fetchRNDiff'
import { isFileIgnored } from '../../utils/isFileIgnored'
import { upgradeFile } from '../../react-native/upgradeRNFile'
import { CLIOptions } from '../../types'
import { helpUpgradeRN } from '../../utils/helpUpgradeRN'

const ignoreFiles = [
  'README.md',
  // more files here if needed
]

const command: GluegunCommand = {
  name: 'react-native',
  alias: ['rn'],
  run: async (toolbox) => {
    const { print, filesystem, parameters } = toolbox
    const options = parameters.options as CLIOptions
    const { colors } = print
    const { gray, red, cyan, white, bold } = colors

    // Retrieve the path of the folder to upgrade, default current folder.
    const dir = parameters.first || './'

    // If help is requested, show that
    if (options.help) {
      print.info(helpUpgradeRN())
      return
    }

    // Make sure the git repo is clean before we start (warn if not)
    await checkGitStatus(toolbox)

    hr()
    flame()

    print.info(`🔥 ${bold(red('Flame AI:'))} ${gray('Ignite your code with the power of AI.')}`)
    hr()
    info('App:', filesystem.path(dir))
    info('Mode:', options.interactive ? `Interactive` : `Upgrade`)

    spin('Fetching app info')
    const appInfo = await fetchRNAppInfo({ dir, options })
    if (appInfo.error) return stop('🙈', appInfo.error)
    const { currentVersion, targetVersion, replacePlaceholder } = appInfo
    hide()

    info('Current:', bold(currentVersion))
    info('Upgrade:', bold(targetVersion))

    spin('Fetching upgrade diff')
    const { files, error: diffError } = await fetchRNDiff({ currentVersion, targetVersion })
    if (diffError) return stop('🙈', diffError)
    hide()

    // update the path and diff with the placeholder values
    files.forEach((f) => {
      f.path = replacePlaceholder(f.path)
      f.diff = replacePlaceholder(f.diff)
    })

    // if they pass --list, just list the files and exit
    if (options.list) {
      print.info('\nFiles that will be upgraded:\n')
      files.forEach((f) => print.success(f.path))
      br()
      return
    }

    hr()

    print.info(bold(white(`Starting ${cyan('React Native')} upgrade using ${red(bold('Flame AI'))}\n`)))

    for (const fileData of files) {
      if (isFileIgnored({ ignoreFiles, only: options.only, fileData })) continue

      const result = await upgradeFile({ fileData, options, currentVersion, targetVersion })

      br()

      if (result.userWantsToExit) break
    }

    // Print a summary of the changes
    summarize(files)

    hr()
    print.info(bold(white(`Done!\n`)))
  },
}

export default command
