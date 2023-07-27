# Flame CLI

Flame is our CLI for interacting with OpenAI and doing codemods and codegen. It includes an interactive mode and several other specialized commands.

```
yarn
yarn link
export OPENAI_API_KEY=INSERTKEYHERE
flame --help
```

## Interactive Code Editing and Authoring Mode

The interactive mode is one of Flame's most exciting features. It allows you to chat with the AI, load files, list files, and make modifications to code using plain English.

To start the interactive mode, run `flame interactive`. The current directory will be where you will be working. You can also specify a directory to work in by running `flame interactive <directory>`.

In the interactive mode, you can use the following special commands:

- `/exit`: Exit the interactive mode.
- `/log`: Print the current chat log.
- `/context`: Print the current context.
- `/context.smart`: Make a smart backchat from the current context and display it for debugging.
- `/clear`: Clear the chat log.
- `/clearlast`: Clear the last message from the chat log.
- `/load <filename>`: Load a file's contents. Useful for evaluating and changing code.
- `/ls <path>`: Load a list files in the specified path. Helps the AI understand what files are available.
- `/logcompress <number>`: Compress the chat log to a specified character count to avoid token limits. It'll automatically compress the log when it gets too long, but you can also do it manually. e.g. `logcompress 5000`. Note these are characters and not tokens.
- `/debug`: Print a full list of interactions, mostly for debugging issues.

## Philosophy

The philosophy behind Flame is that you should be able to tell it to make changes to your code in plain English, and it can create a plan and actually make those changes to your code, writing very good code that matches the rest of your project.

## File Structure

Like most Gluegun apps, the commands live in src/commands and there are utility functions in src/utils. There's also a bunch of ai related functionality in src/ai.

# License

Proprietary, Infinite Red and Jamon Holmgren.
