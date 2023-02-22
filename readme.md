# flame CLI

flame is our CLI for interacting with OpenAI and doing codemods and codegen.

```
yarn
yarn link
export OPENAI_API_KEY=INSERTKEYHERE
flame --help
```

## Publishing to NPM

To package your CLI up for NPM, do this:

```shell
$ npm login
$ npm whoami
$ npm test

$ npm run build

$ npm publish
```

# License

Proprietary.
