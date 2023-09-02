# Flame AI 🔥

Flame AI is our CLI for interacting with OpenAI and doing codemods and codegen. It includes an interactive mode and several other specialized commands.

<img alt="Flame AI screenshot" src="https://github.com/infinitered/flame/assets/1479215/68784ba3-4526-4312-8dcc-35741ebf1a0e">

To run it, you need Node v18+ installed and have access to an OpenAI [gpt-4 token key](https://platform.openai.com/account/api-keys). If you need access to gpt-4, [here's how to get it](https://help.openai.com/en/articles/7102672-how-can-i-access-gpt-4).

```
npx flame --help
```

## Commands

To see all commands, including some exciting experimental features, check out the [Command Reference](docs/commands.md).

### Upgrade: React Native

Flame AI's most effective command is for upgrading React Native apps.

Run this in the root of your React Native app:

```
# one-shot upgrade
npx flame upgrade react-native

# recommended interactive mode (much cooler):
npx flame upgrade react-native --interactive
```

Here's the command with all available options:

```
npx flame upgrade react-native --interactive --from=0.72.2 --to=auto --list --only=somefile.mm
```

## Philosophy

AI (specifically large language models like OpenAI's ChatGPT) is a powerful tool. Flame AI is built to be a minimalist CLI that brings a great developer experience and useful tools for making code modifications (codemods) and code generation.

Given that [Infinite Red](https://infinite.red) is a React Native consultancy, the bulk of the built-in tools for Flame will be tuned for React Native development; however, the CLI is built to be extensible and we welcome contributions from the community.

## A note about costs

Note that Flame AI costs a nominal amount of money to run, via OpenAI's API pricing. In our experiments, running a full React Native upgrade will cost about $0.05 USD or less. We frequently hit around $5 per day total cost when testing it over and over during a full work day. You must ensure you watch the CLI while it's working to ensure it doesn't get stuck in a loop and run up your bill. We are not responsible for any costs incurred by using Flame AI. We don't want those bills either, so we are regularly adding features and checks to avoid these sorts of issues. At this point, running Flame AI in an automated / unmonitored fashion is not recommended.

## Limitations

- You _must_ have gpt-4 access for Flame AI to be useful. Our experiments with gpt-3.5-turbo have been very underwhelming.
- **The biggest limitation for FlameAI is the lack of prompt size.** Currently, we're working with gpt-4, which has a token size of 8192 tokens (around 24k characters). This sounds like a lot, but considering a single code file of 200 lines can take up north of 10k characters, it is very limiting. When we have access to gpt-4-32k, we'll be able to do much more. Despite that, we've made impressive progress with the current token size.
- LLMs are not perfect. They can hallucinate, miss stuff, and be generally weird. We're working on ways to mitigate this, but it's a limitation of the technology.
- LLMs are not magic. They can't do everything. They're not a replacement for human developers. They're a tool to help developers be more productive.

## Contributing, modifying, running locally

See the [Contributing Guide](docs/contributing.md).

## Get Help

If you have questions, concerns, bug reports, etc, please file an issue in this repository's Issue Tracker.

Feel free to join our community Slack and join the #flame-ai-cli channel here: [https://community.infinite.red](https://community.infinite.red).

# License

Copyright (c) 2023 Jamon Holmgren & Infinite Red, Inc.

This project is open source and licensed under the MIT License.
