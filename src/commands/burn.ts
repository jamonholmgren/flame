// Gluegun command that generates an entire app using a series of prompts. It knows how to piece
// together multiple instructions from the AI and write to the proper files.
// It also will ask which AI to use, such as ChatGPT 3.5, 4, or Claude.

import { GluegunCommand, GluegunFilesystem } from 'gluegun'

// import { claudePrompt } from '../ai/claude'
import { chatGPTPrompt } from '../ai/openai'
import { ChatCompletionRequestMessage } from 'openai'

const command: GluegunCommand = {
  name: 'burn',
  run: async (toolbox) => {
    const { print, filesystem, system, prompt } = toolbox

    // // first, ask the user which AI they want to use
    // const aiProvider = await prompt.ask({
    //   type: 'select',
    //   name: 'ai',
    //   message: 'Which AI do you want to use?',
    //   choices: ['ChatGPT 3.5', 'ChatGPT 4', 'Claude'],
    // })

    // verify the user is in the source folder by showing them the path and asking if it's okay
    const currentPath = filesystem.cwd()
    const okay = await prompt.confirm(
      `You're in ${currentPath}. All files will be output in here. Is this okay?`
    )

    if (!okay) {
      print.error('Aborting.')
      process.exit(1)
    }

    // start the prompt loop
    let prompts: ChatCompletionRequestMessage[] = [
      {
        content:
          'Use HTML, CSS, and JavaScript (via TypeScript). Assume Parcel will be used to compile and serve the app. Use small functions and files. Include all necessary code. Only return one file at a time. I will prompt when I want the next file. Use this format:\n\ncreate file: <filename>\n<contents here>\n\nupdate file: <filename>\n<describe changes here>\n\n',
        role: 'user',
      },
    ]

    while (true) {
      // ask the user for a prompt
      let promptText = (
        await prompt.ask({
          type: 'input',
          name: 'prompt',
          message:
            'What would you like to generate today? (apply: apply last file changes, end: exit)\n\n',
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

      prompts.push({
        content: promptText,
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

      // use parseInstructions to loop through any files that require changes and apply them, one at a time.
      const instructions = await parseInstructions(lastPrompt)

      // for each instruction key, apply it
      for (const lastPromptAction of Object.keys(instructions)) {
        let contents = instructions[lastPromptAction]

        if (lastPromptAction.includes('create file: ')) {
          // create file -- filename is after "create file: "
          const filename = lastPromptAction.split('create file: ')[1]
          // contents are the rest of the lines

          contents = contents.trim()

          // trim backticks from the beginning and end of the contents if they exist
          if (contents.startsWith('```')) contents = contents.slice(3).trim()
          if (contents.endsWith('```')) contents = contents.slice(0, -3).trim()

          // make sure the user is okay with this:
          const okay = await prompt.confirm(
            `Are you sure you want to create ${filename} with the following contents?\n\n${contents}`
          )

          if (!okay) continue

          // write the file
          await filesystem.writeAsync(filename, contents)
        } else if (lastPromptAction.includes('update file: ')) {
          // read the existing file, if it exists
          const filename = lastPromptAction.split('update file: ')[1]
          const changes = contents

          // does that file exist?
          const exists = await filesystem.existsAsync(filename)

          let existingFileContents = ''
          if (!exists) {
            print.warning(`File ${filename} does not exist. It'll be created.`)
          } else {
            // read the file
            existingFileContents = await filesystem.readAsync(filename)
          }

          // now use openAI to modify the file
          let response = await chatGPTPrompt({
            prompts: [
              {
                content: `For this file:\n\n\`\`\`${existingFileContents}\`\`\`\n\nMake these changes:\n\n\`\`\`${changes}\`\`\`\n\nReturn just the new file contents. If no changes are necessary, still return the file contents.\n`,
                role: 'user',
              },
            ],
          })

          response = response.trim()

          // trim backticks from the beginning and end of the response if they exist
          if (response.startsWith('```')) response = response.slice(3)
          if (response.endsWith('```')) response = response.slice(0, -3)

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
