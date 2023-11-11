import { SessionContext } from '../../types'
import { generateSummary } from './generateSummary'
import { loadFile } from './loadFile'

export async function generateProjectSummary(context: SessionContext) {
  // load the README.md file if it exists
  const loadedFile = await loadFile('README.md')

  if (loadedFile?.contents) {
    // Generate a summary from the README.md file
    const summary = await generateSummary(
      `Use the following README.md contents and file list to generate a summary of the project as few words as possible. Focus on things that are important for a coder to know about the project before they start working on it.`,
      loadedFile.contents + `\n\nHere are all the files in the project:\n\n` + context.files.join('\n'),
    )

    context.project = summary
  } else {
    // no readme, so we'll have to ask the user for a summary
    context.project = `The project is located at ${context.cwd}.`
  }
}
