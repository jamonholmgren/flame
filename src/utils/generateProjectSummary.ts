import { SmartContext } from '../types'
import { generateSummary } from './generateSummary'
import { loadFile } from './loadFile'

export async function generateProjectSummary(context: SmartContext) {
  // load the README.md file if it exists
  const readmeFile = await loadFile('README.md', context)

  if (readmeFile) {
    // Generate a summary using gpt-3.5-turbo
    const summary = await generateSummary(
      `Use the following README.md contents to generate a summary of the project as few words as possible.`,
      readmeFile.contents
    )

    context.project = summary
  } else {
    // no readme, so we'll have to ask the user for a summary
    context.project = `The project is located at ${context.workingFolder}.`
  }
}
