# coderev CLI

Command-line interface for reviewing public GitHub repos.

## Setup

From the monorepo root:

```bash
npm install
npm run build:core
npm run build:cli
```

```bash
# run
node apps/cli/dist/cli.js --help
# or after npm link from apps/cli
npm link -w coderev
coderev --help
```

See the root [README.md](../../README.md) for Windows / macOS / Linux env setup.
