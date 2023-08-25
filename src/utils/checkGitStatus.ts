import { GluegunToolbox } from 'gluegun'

export async function checkGitStatus(toolbox: GluegunToolbox) {
  // Check if they have a git repo and a dirty working working tree, and warn
  // them that they should commit their changes before upgrading.
  // redirect errors to /dev/null
  const gitStatus = await toolbox.system
    .run('git status --porcelain', { trim: true, stderr: 'ignore' })
    .catch(() => 'error')
  if (gitStatus) {
    if (gitStatus === 'error') {
      toolbox.print.warning("\n   Couldn't find a git repo.")
      toolbox.print.warning(`\n   We highly recommend that you initialize one before upgrading.\n`)
    } else {
      toolbox.print.warning(`\n   You have uncommitted changes in your git repo.`)
      toolbox.print.warning(`\n   We highly recommend that you commit them before upgrading.\n`)
    }
  }
}
