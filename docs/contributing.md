# Contributing

## Get Started

1. Clone this repo or your fork (`git clone git@github.com:infinitered/flame.git`)
2. `yarn install`
3. `yarn link`
4. `flame --help`

## Architecture

Like most Gluegun apps, the commands live in `src/commands` and there are utility functions in `src/utils`. There's also a bunch of ai related functionality in `src/ai`. There are a few React Native specific features in `src/react-native`.

Tips (note this can change as the project evolves):

- We want to keep the folder structure very _flat_. We don't want super deep nested folders.
- Generally speaking, keep the commands as thin as possible, primarily focused on user interaction. Put the bulk of the logic in other folders.
- If something is React Native specific, put it in the `src/reactnative` folder.
- If you're building something for a different technology and it's specific to that technology, you can make another folder for it. For example, `src/flutter`.
- If you're building something that's not specific to any technology, put it in the `src/utils` folder.
- If you're building something that's very AI related, put it in the `src/ai` folder. Mostly things like accessing other AI cloud providers/LLMs. (Most of the AI code will still reside in `utils`)
- The `src/recipes` folder is for recipes that are used by the `experimental convert` command. They are written in plain English and are mostly a list of examples. See the `AsyncStorage-to-mmkv` recipe for an example.
- Keep source files small. This means a lot of small files will be created, but that's okay. This helps us build Flame AI using Flame AI. :-)
