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

- `exit`: Exit the interactive mode.
- `log`: Print the current chat log.
- `clear`: Clear the chat log.
- `clearlast`: Clear the last message from the chat log.
- `load <filename>`: Load a file's contents. Useful for evaluating and changing code.
- `ls <path>`: Load a list files in the specified path. Helps the AI understand what files are available.
- `logcompress <number>`: Compress the chat log to a specified character count to avoid token limits. It'll automatically compress the log when it gets too long, but you can also do it manually. e.g. `logcompress 5000`. Note these are characters and not tokens.
- `debug`: Print a full list of interactions, mostly for debugging issues.

# License

Proprietary, Infinite Red and Jamon Holmgren.
