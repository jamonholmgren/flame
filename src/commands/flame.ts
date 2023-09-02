import { GluegunCommand } from 'gluegun'
import { br, flame, hr } from '../utils/printing'
import { helpUpgradeRN } from '../utils/helpUpgradeRN'

const command: GluegunCommand = {
  name: 'flame',
  alias: ['help'],
  run: async (toolbox) => {
    const { print } = toolbox
    const { gray, red, bold, white, cyan } = print.colors

    hr()
    flame()
    print.info(`🔥 ${bold(red('Flame AI:'))} ${gray('Ignite your code with the power of AI.')}`)
    hr()

    print.info(`
Flame AI is a tool that brings the power of AI to your codebase.

${gray(`Created by Jamon Holmgren (@jamonholmgren) and the Infinite Red team.`)}

${bold(white(`Commands:`))}

${helpUpgradeRN()}

${cyan(`For more information, visit https://github.com/infinitered/flame.`)}
    `)
  },
}

export default command
