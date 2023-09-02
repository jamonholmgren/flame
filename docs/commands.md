# Command Reference for Flame AI

Flame AI is a CLI built using [Gluegun](https://github.com/infinitered/gluegun), and has a number of commands for interacting with OpenAI and doing codemods and codegen. It includes an interactive mode and several other specialized commands.

## Upgrade: React Native

Flame AI has a command for upgrading React Native apps. This is the most mature command in Flame AI and is used in production by [Infinite Red](https://infinite.red).

Run this in the root of your React Native app (where the `package.json` and `app.json` live):

```
# one-shot upgrade
npx flame upgrade react-native

# recommended interactive mode (much more interesting):
npx flame upgrade react-native --interactive
```

Here's the command with all available options:

```
npx flame upgrade react-native --interactive --from=0.72.2 --to=auto --list --only=somefile.mm
```

## EXPERIMENTAL: Interactive Code Editing and Authoring Mode

The interactive mode is one of Flame's most exciting features, but it's still **very much a work in progress.** It allows you to chat with the AI, load files, list files, and make modifications to code using plain English.

To start the interactive mode, run `flame experimental interactive`. The current directory will be where you will be working. You can also specify a directory to work in by running `flame experimental interactive <directory>`.

In the interactive mode, you can use the following special commands:

- `/exit`: Exit the interactive mode.
- `/load <filename>`: Load a file's contents. Useful for evaluating and changing code.
- `/log`: Print the current chat log for debugging purposes.
- `/context`: Print the current context.
- `/clear`: Clear the chat log.
- `/clearlast`: Clear the last message from the chat log.
- `/ls <path>`: Load a list files in the specified path. Helps the AI understand what files are available.
- `/logcompress <number>`: Compress the chat log to a specified character count to avoid token limits. It'll automatically compress the log when it gets too long, but you can also do it manually. e.g. `logcompress 5000`. (Note these are characters and not tokens. Tokens are roughly 3 characters each.)
- `/debug`: Print a full list of interactions, mostly for debugging issues.

## EXPERIMENTAL: Flame AI Convert

Flame AI Convert is a command that allows you to convert code from X to Y using a recipe. It's still very much a work in progress, but it's already useful for converting between the few experimental recipes we have, such as converting from React Native AsyncStorage to react-native-mmkv.

To use it, run `flame experimental convert <recipe> <input> <output>`. For example:

```
npx flame experimental convert AsyncStorage mmkv ./my-file.ts
```

Recipes are stored in `src/recipes`. They are written in plain English and often are a list of examples. To see what a recipe looks like, check out the `AsyncStorage-to-mmkv` recipe.
