import { GluegunCommand } from 'gluegun'
import { flameHeader } from '../utils/printing'
import { helpUpgradeRN } from '../utils/helpUpgradeRN'

const command: GluegunCommand = {
  name: 'flame',
  alias: ['help'],
  run: async (toolbox) => {
    const { print, meta } = toolbox
    const { gray, bold, white, cyan, yellow } = print.colors

    flameHeader()

    const version = meta.version()

    print.info(`
Flame AI is a tool that brings the power of AI to your codebase.

Version: ${print.colors.bold(version)}

${yellow(`⚠️ Note: Flame AI is currently experimental. Use at your own risk, and report
  issues on the repo: https://github.com/infinitered/flame`)}

${gray(`Created by Jamon Holmgren (@jamonholmgren) and the Infinite Red team.`)}

${bold(white(`Commands:`))}
${helpUpgradeRN()}

${cyan(`For more information, visit https://github.com/infinitered/flame.`)}
    `)
  },
}

export default command
