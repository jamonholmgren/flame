import { print } from 'gluegun'

const { gray, red, bold, white, cyan } = print.colors

export function helpUpgradeRN() {
  return `
${gray(`npx`)} ${red(bold('flame'))} ${white('upgrade')} ${cyan('react-native')} ${gray('--interactive')}

${gray(`This command upgrades your React Native app to the latest version`)}
${gray(`in an interactive and intelligent way.`)}

${gray(`It uses AI to determine the best way to upgrade each file and`)}
${gray(`asks you to give advice along the way.`)}

Options:

  --interactive ${gray(`Run in interactive mode.`)}
  --list ${gray(`List the files that will be upgraded.`)}
  --only ${gray(`Only upgrade files that match this string.`)}
  `
}
