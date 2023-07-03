// Gluegun command that generates an entire app using a series of prompts. It knows how to piece
// together multiple instructions from the AI and write to the proper files.
// It also will ask which AI to use, such as ChatGPT 3.5, 4, or Claude.

import { GluegunCommand, GluegunFilesystem } from 'gluegun'

import { chatGPTPrompt } from '../ai/openai'
import { ChatCompletionRequestMessage } from 'openai'

const command: GluegunCommand = {
  name: 'burn',
  run: async (toolbox) => {
    const { print, filesystem, system, prompt } = toolbox

    // start the prompt loop
    let prompts: ChatCompletionRequestMessage[] = [
      {
        content:
          'Use HTML, CSS, and JavaScript (via TypeScript). Assume Parcel will be used to compile and serve the app. All links to JS files should use the .ts extension. All JS files should be TypeScript. Use small functions and files. Use this format:\n\nfile: <filename1>\n\nfile: <filename2>\n\nDo not include files that do not need to be created or updated.\n\nDo not include file contents yet; I will ask for the contents when ready.\n\n',
        role: 'user',
      },
    ]

    while (true) {
      // ask the user for a prompt
      let promptText = (
        await prompt.ask({
          type: 'input',
          name: 'prompt',
          message: 'What would you like to generate today?\n\n',
        })
      ).prompt

      // if the prompt is empty, skip it
      if (promptText === '') continue

      // if the prompt is "end", end the loop
      if (promptText === 'end') return

      // if the prompt is "commit", compose a git message and commit it
      if (promptText === 'commit') {
        // get the git diff
        const gitDiff = await system.run('git diff')
        // if it's really big, truncate it
        const gitDiffTruncated =
          gitDiff.length > 1000 ? gitDiff.slice(0, 1000) : gitDiff

        // get the commit message from AI
        const messages: ChatCompletionRequestMessage[] = [
          ...prompts,
          {
            content: `What would be a good git commit message for the last changes? As a help, here is the git diff:\n\n${gitDiffTruncated}\n\nReturn JUST the commit message, nothing else.`,
            role: 'user',
          },
        ]
        const commitMessage = await chatGPTPrompt({ prompts: messages })

        console.log('commitMessage', commitMessage)

        // prompt the user with the commit message, which they can modify
        const commitMessagePrompt = await prompt.ask({
          type: 'input',
          name: 'commitMessage',
          message: 'Commit message:',
          initial: commitMessage,
        })

        // commit the changes with git
        const commitMessageFinal = commitMessagePrompt.commitMessage
        const commitResult = await system.run(
          `git add -A && git commit -am "${commitMessageFinal.replace(
            /"/g,
            '\\"'
          )}"`
        )
        console.log('commitResult', commitResult)

        continue
      }

      if (promptText === 'current') {
        console.log('Current prompts:', prompts)
        continue
      }

      if (promptText === 'reset') {
        prompts = [prompts[0]]
        continue
      }

      prompts.push({
        content: `${promptText}\n\nWhat files need to be changed to do this? Use this format:\n\nfile: <filename1>\nfile: <filename2>\n\n`,
        role: 'user',
      })

      // ask the AI for a response
      let response = ''

      response = await chatGPTPrompt({
        prompts,
      })

      if (response.length === 0) continue

      // apply the changes
      const lastPrompt = response

      // add the last prompt to the prompts array
      prompts.push({
        content: lastPrompt,
        role: 'assistant',
      })

      // use parseInstructions to loop through any files that require changes and apply them, one at a time.
      // const instructions = await parseInstructions(lastPrompt)
      const changedFiles = parseFileChanges(lastPrompt)

      print.info(`Files to be changed: ${changedFiles.join(', ')}\n\n`)

      // todo: add contents of existing files that will be affected to a temporary prompts array

      // for each instruction key, apply it
      for (const lastPromptAction of changedFiles) {
        if (lastPromptAction.startsWith('file: ')) {
          // read the existing file, if it exists
          const filename = lastPromptAction.split('file: ')[1]

          // does that file exist?
          const exists = await filesystem.existsAsync(filename)

          let existingFileContents = ''
          let updatePrompt = ''
          if (!exists) {
            print.warning(`File ${filename} does not exist. It'll be created.`)
            updatePrompt = `What should be the contents of ${filename}? Just the contents, nothing else. Do not include backticks.`
          } else {
            // read the file
            existingFileContents = await filesystem.readAsync(filename)

            // if the file is too large, we won't be able to provide it to the AI
            if (existingFileContents.length > 10000) {
              print.warning(
                `File ${filename} is too large to provide to the AI. We'll provide some of it.`
              )
              existingFileContents =
                existingFileContents.slice(0, 9000) +
                '\n// ... truncated for brevity ...'
            }

            updatePrompt = `For this file:\n\n\`\`\`${existingFileContents}\`\`\`\n\nReturn just the new file contents with the changes requested. If no changes are necessary, still return the file contents.\n`
          }

          // now use openAI to modify the file
          let response = await chatGPTPrompt({
            prompts: [
              ...prompts,
              {
                content: updatePrompt,
                role: 'user',
              },
            ],
          })

          response = response.trim()

          // trim backticks from the beginning and end of the response if they exist, including anything else on that line
          if (response.startsWith('```')) {
            response = response.split('\n').slice(1).join('\n')
          }
          if (response.endsWith('```')) {
            response = response.split('\n').slice(0, -1).join('\n')
          }

          // make sure the user is okay with this:
          const okay = await prompt.confirm(
            `Are you sure you want to update ${filename} with the following contents?\n\n${response}`
          )

          if (!okay) {
            // ask for clarifications from the user
            continue
          }

          // write the file
          await filesystem.writeAsync(filename, response)
        } else {
          print.error('Unknown action: ' + lastPromptAction)
        }
      }

      console.log(response)
    }
  },
}
module.exports = command

async function applyChanges(example, fs: GluegunFilesystem) {
  const instructions = example
    .split('\n\n')
    .map((instruction) => instruction.trim())

  for (const instruction of instructions) {
    const [action, ...args] = instruction.split('\n').map((arg) => arg.trim())

    switch (action) {
      case 'create file': {
        const fileName = args[0]
        const fileContent = args.slice(1).join('\n')
        await fs.writeAsync(fileName, fileContent)
        break
      }
      case 'delete file': {
        const fileName = args[0]
        await fs.removeAsync(fileName)
        break
      }
      case 'rename file': {
        const oldName = args[0]
        const newName = args[1]
        await fs.moveAsync(oldName, newName)
        break
      }
      case 'update file': {
        const fileName = args[0]
        let fileContent = await fs.readAsync(fileName)
        for (let i = 1; i < args.length; i++) {
          const [operation, target, replacement] = args[i]
            .split(/[\s]+/)
            .slice(-3)
          if (operation === 'replace') {
            fileContent = fileContent.replace(target, replacement)
          } else if (operation === 'add') {
            const tag = new RegExp(`<${target}[^>]*>`).exec(fileContent)
            if (tag) {
              const updatedTag = tag[0].replace('>', ` ${replacement}>`)
              fileContent = fileContent.replace(tag[0], updatedTag)
            }
          }
        }
        await fs.writeAsync(fileName, fileContent)
        break
      }
    }
  }
}

function parseInstructions(example) {
  const instructionPattern =
    /(?:create file:|update file:)\s*[a-zA-Z0-9_\-/.]+\s*\n```[\s\S]*?```/g
  const instructions = example.match(instructionPattern)

  if (!instructions) return {}

  const parsedInstructions = {}

  for (const instruction of instructions) {
    const separatorIndex = instruction.indexOf('\n')
    const key = instruction.substring(0, separatorIndex).trim()
    const value = instruction
      .substring(separatorIndex + 1)
      .replace(/^```\n/, '')
      .replace(/\n```$/, '')
    parsedInstructions[key] = value
  }

  return parsedInstructions
}

function parseFileChanges(example) {
  const instructionPattern = /(?:file:)\s*[a-zA-Z0-9_\-/.]+/g
  const instructions = example.match(instructionPattern)

  if (!instructions) return []

  return instructions.map((i) => i.trim())
}
