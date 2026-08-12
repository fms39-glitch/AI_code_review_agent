# coderev

Open-source **CLI + Web** toolkit that reviews **public GitHub repositories** with an LLM.

- **Free path:** Nvidia NIM (OpenAI-compatible API)
- **BYOK:** OpenAI or any OpenAI-compatible endpoint
- **No database** — keys stay on your machine / request
- **Works on Windows, macOS, and Linux** (Node.js 20+)

## Monorepo structure

```text
apps/cli          # coderev command-line tool
apps/web          # Next.js web UI
packages/core     # shared GitHub + review pipeline (@coderev/core)
```

| App | Docs | Start |
|-----|------|--------|
| **CLI** | [apps/cli/README.md](./apps/cli/README.md) | `npm run build:cli` then `node apps/cli/dist/cli.js` |
| **Web** | [apps/web/README.md](./apps/web/README.md) | `npm run dev:web` → http://localhost:3000 |
| **Core** | shared package | `npm run build:core` |

Deep dive: [walkthrough.md](./walkthrough.md)

## Requirements

- Node.js **20+**
- A public GitHub repo
- An API key: Nvidia NIM **or** your own provider key

| OS | Notes |
|----|--------|
| **Windows** | PowerShell: `$env:VAR = "..."` |
| **macOS / Linux** | bash/zsh: `export VAR=...` |

Tip: a local `.env` works the same on all platforms for the CLI. For the web app, use `apps/web/.env.local` for optional server-side NIM demo key.

---

## Quick start (from repo root)

```bash
npm install
npm run build:core
```

### CLI

**macOS / Linux**

```bash
npm run build:cli
node apps/cli/dist/cli.js init
cp .env.example .env   # or copy from apps/cli/.env.example
# edit .env → NVIDIA_API_KEY=nvapi-...
node apps/cli/dist/cli.js doctor
node apps/cli/dist/cli.js review sindresorhus/is --provider nim --max-files 15
```

**Windows (PowerShell)**

```powershell
npm run build:cli
node apps/cli/dist/cli.js init
Copy-Item .env.example .env
# edit .env → NVIDIA_API_KEY=nvapi-...
node apps/cli/dist/cli.js doctor
node apps/cli/dist/cli.js review sindresorhus/is --provider nim --max-files 15
```

Dev shortcut: `npm run dev:cli -- --help`

### Web

```bash
# optional free NIM demo on the server
# apps/web/.env.local → NVIDIA_API_KEY=nvapi-...

npm run build:core
npm run dev:web
```

Open http://localhost:3000

1. Paste a public `owner/repo`
2. Pick provider (NIM / OpenAI / custom)
3. Paste your API key for this run (or leave blank for NIM if server key is set)
4. Click **Review repository**
5. Download MD / JSON if you want — nothing is stored server-side

Production web build:

```bash
npm run build:web
npm run start -w @coderev/web
```

---

## Providers (shared by CLI + Web)

| Mode | Config |
|------|--------|
| `nim` | `NVIDIA_API_KEY` or pasted key · default `https://integrate.api.nvidia.com/v1` |
| `openai` | `OPENAI_API_KEY` / pasted key |
| `custom` | base URL + key + model (any OpenAI-compatible API) |

Optional `GITHUB_TOKEN` raises public GitHub API rate limits (CLI env or `apps/web/.env.local`).

## CLI commands

| Command | Purpose |
|---------|---------|
| `coderev init` | Write `.env.example` + next steps |
| `coderev doctor` | Check Node, keys, GitHub limits |
| `coderev review <repo>` | Run structured review |

Flags: `--provider`, `--model`, `--base-url`, `--api-key`, `--path`, `--ext`, `--max-files`, `--ref`, `--out`, `--json`, `--verbose`

## Architecture

```text
CLI  ──┐
       ├──► @coderev/core ──► GitHub API + LLM (NIM / BYOK)
Web UI ┘         ▲
                 │
         POST /api/review
```

1. Parse public repo
2. List / filter / fetch files
3. Chunk for context limits
4. Structured LLM review (`generateObject` + Zod)
5. Return scores + findings (terminal, files, or web UI)

## License

MIT
