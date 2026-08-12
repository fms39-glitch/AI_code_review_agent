# coderev

Open-source CLI that reviews **public GitHub repositories** with an LLM.

- **Free path:** Nvidia NIM (OpenAI-compatible API)
- **BYOK:** OpenAI or any OpenAI-compatible endpoint (`--base-url` + key + model)
- **No database** — keys and reports stay on your machine
- **Works on Windows, macOS, and Linux** (Node.js 20+)

## Deep dive

For a detailed explanation of the pipeline (GitHub fetch → select → chunk → LLM → report) and full usage examples, see [walkthrough.md](./walkthrough.md).

## Requirements

- Node.js **20+** ([nodejs.org](https://nodejs.org/))
- A public GitHub repo URL (`owner/repo` or `https://github.com/owner/repo`)
- An API key: Nvidia NIM **or** your own provider key

| OS | Notes |
|----|--------|
| **Windows** | PowerShell 5+ or Windows Terminal. Use `$env:VAR = "..."` for session env vars. |
| **macOS** | Terminal / zsh (default). Use `export VAR=...`. |
| **Linux** | bash/zsh. Use `export VAR=...`. |

Tip: putting keys in a local `.env` file works the same on all three OSes — `coderev` loads it automatically.

---

## Install

### From this repo (all platforms)

```bash
npm install
npm run build
```

Run without a global install:

```bash
# all platforms
node dist/cli.js --help
npx tsx src/cli.ts --help
```

Optional global command (`coderev` on your PATH):

```bash
npm link
coderev --help
```

Once published to npm:

```bash
npm i -g coderev
# or one-off
npx coderev --help
```

Below, examples use `coderev`. If you did not `npm link`, substitute `node dist/cli.js` (or `npx tsx src/cli.ts` while developing).

---

## How to make it work (command-first)

### 1. Scaffold env template

**macOS / Linux (bash/zsh)**

```bash
coderev init
cp .env.example .env
```

**Windows (PowerShell)**

```powershell
coderev init
Copy-Item .env.example .env
```

Edit `.env` and add your key(s). This is the easiest cross-platform option.

### 2. Choose a provider

#### Free — Nvidia NIM

1. Create a key at [build.nvidia.com](https://build.nvidia.com/explore/discover)
2. Set it either in `.env`:

```env
NVIDIA_API_KEY=nvapi-...
```

or in your shell for the current session:

**macOS / Linux**

```bash
export NVIDIA_API_KEY=nvapi-...
```

**Windows (PowerShell)**

```powershell
$env:NVIDIA_API_KEY = "nvapi-..."
```

**Windows (CMD)**

```cmd
set NVIDIA_API_KEY=nvapi-...
```

#### BYOK — OpenAI

**macOS / Linux**

```bash
export OPENAI_API_KEY=sk-...
```

**Windows (PowerShell)**

```powershell
$env:OPENAI_API_KEY = "sk-..."
```

#### BYOK — any OpenAI-compatible API

**macOS / Linux**

```bash
export API_KEY=...
export BASE_URL=https://api.openai.com/v1
export MODEL=gpt-4o-mini
```

**Windows (PowerShell)**

```powershell
$env:API_KEY = "..."
$env:BASE_URL = "https://api.openai.com/v1"
$env:MODEL = "gpt-4o-mini"
```

#### Optional GitHub token (higher public API rate limits)

**macOS / Linux**

```bash
export GITHUB_TOKEN=ghp_...
```

**Windows (PowerShell)**

```powershell
$env:GITHUB_TOKEN = "ghp_..."
```

### 3. Validate setup

```bash
coderev doctor
coderev doctor --provider custom
```

### 4. Review a public repo

Commands below are the same on Windows, macOS, and Linux when keys are already in `.env` or the environment.

```bash
# Nvidia NIM (default provider)
coderev review sindresorhus/is --provider nim --max-files 15

# OpenAI BYOK
coderev review owner/repo --provider openai --model gpt-4o-mini
```

**Custom OpenAI-compatible BYOK**

macOS / Linux:

```bash
coderev review owner/repo --provider custom \
  --base-url https://api.openai.com/v1 \
  --api-key "$OPENAI_API_KEY" \
  --model gpt-4o-mini
```

Windows (PowerShell) — use backticks for line continuation:

```powershell
coderev review owner/repo --provider custom `
  --base-url https://api.openai.com/v1 `
  --api-key $env:OPENAI_API_KEY `
  --model gpt-4o-mini
```

Windows one-liner:

```powershell
coderev review owner/repo --provider custom --base-url https://api.openai.com/v1 --api-key $env:OPENAI_API_KEY --model gpt-4o-mini
```

### 5. Narrow scope + save reports (still no DB)

**macOS / Linux**

```bash
coderev review owner/repo \
  --path src/ \
  --ext ts,tsx \
  --max-files 40 \
  --ref main \
  --out review.md \
  --json review.json
```

**Windows (PowerShell)**

```powershell
coderev review owner/repo `
  --path src/ `
  --ext ts,tsx `
  --max-files 40 `
  --ref main `
  --out review.md `
  --json review.json
```

### Discover flags from the CLI itself

```bash
coderev --help
coderev review --help
coderev doctor --help
coderev init --help
```

---

## Quick copy-paste by OS

### Windows (PowerShell)

```powershell
npm install
npm run build
node dist/cli.js init
Copy-Item .env.example .env
# edit .env → set NVIDIA_API_KEY=nvapi-...
node dist/cli.js doctor
node dist/cli.js review sindresorhus/is --provider nim --max-files 15 --out review.md
```

### macOS / Linux

```bash
npm install
npm run build
node dist/cli.js init
cp .env.example .env
# edit .env → set NVIDIA_API_KEY=nvapi-...
node dist/cli.js doctor
node dist/cli.js review sindresorhus/is --provider nim --max-files 15 --out review.md
```

---

## Commands

| Command | Purpose |
|---------|---------|
| `coderev init` | Write `.env.example` and print next steps |
| `coderev doctor` | Check Node, keys, GitHub rate limit |
| `coderev review <repo>` | Fetch public repo files and run structured review |

### `review` flags

| Flag | Description |
|------|-------------|
| `-p, --provider` | `nim` \| `openai` \| `custom` (default: `nim`) |
| `-m, --model` | Model id |
| `--base-url` | OpenAI-compatible base URL |
| `-k, --api-key` | API key (else env) |
| `--path` | Only files under this path prefix |
| `--ext` | Comma-separated extensions |
| `--max-files` | Cap files reviewed (default `40`) |
| `--ref` | Branch / tag / SHA |
| `-o, --out` | Write markdown report |
| `--json` | Write JSON report |
| `-v, --verbose` | Extra logs |

## What you get

Structured review with:

- Scores: quality, performance, security, architecture (0–10)
- Findings: severity, category, file, issue, recommendation
- Architecture notes + summary
- Optional `review.md` / `review.json` on disk

## Architecture (no server, no DB)

1. Parse `owner/repo` or GitHub URL
2. List public tree via GitHub API
3. Filter / rank / cap files
4. Download contents
5. Chunk into prompt batches
6. Call LLM via Vercel AI SDK (`generateObject`)
7. Print terminal summary (+ optional files)

Keys never leave your machine except to the LLM provider you chose.

## Development

Same npm scripts on all platforms:

```bash
npm install
npm run dev -- --help
npm run dev -- doctor
npm run build
npm start -- review owner/repo --provider nim --max-files 10
```

On Windows PowerShell, if `--` forwarding ever misbehaves, call the binary directly:

```powershell
npx tsx src/cli.ts doctor
node dist/cli.js review owner/repo --provider nim --max-files 10
```

## License

MIT
