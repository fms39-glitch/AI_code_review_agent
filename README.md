# coderev

Review **public GitHub repos** with an LLM — **CLI** and **Web**. No database.

- Free: Nvidia NIM
- BYOK: OpenAI or any OpenAI-compatible API
- Node.js 20+ · Windows / macOS / Linux

```text
apps/cli       CLI tool
apps/web       Web UI
packages/core  Shared review engine
```

More detail: [walkthrough.md](./walkthrough.md)

---

## Setup (once)

```bash
npm install
npm run link:cli
```

That builds the CLI and puts `coderev` on your PATH.

Put your key in `.env` (copy from `.env.example`):

```env
NVIDIA_API_KEY=nvapi-...
```

---

## CLI

```bash
coderev doctor
coderev review owner/repo --provider nim
coderev review owner/repo --provider nim --out review.md
```

Examples:

```bash
coderev review fms39-glitch/AI_code_review_agent --provider nim
coderev review owner/repo --provider openai --model gpt-4o-mini
coderev review owner/repo --provider custom --base-url https://api.openai.com/v1 --api-key "$OPENAI_API_KEY" --model gpt-4o-mini
```

Help: `coderev --help` · `coderev review --help`

### Does `--provider` change the model/key?

**Yes.** It picks which key + default model are used:

| `--provider` | Key | Default model |
|---------------|-----|---------------|
| `nim` | `NVIDIA_API_KEY` | `meta/llama-3.1-8b-instruct` |
| `openai` | `OPENAI_API_KEY` | `gpt-4o-mini` |
| `custom` | `--api-key` + `--base-url` + `--model` | you choose |

### Env vars by OS

| OS | Set key for this terminal |
|----|---------------------------|
| macOS / Linux | `export NVIDIA_API_KEY=nvapi-...` |
| Windows PowerShell | `$env:NVIDIA_API_KEY = "nvapi-..."` |

Or use a root `.env` — `coderev` loads it from the folder you run in.

Without linking, you can still run: `node apps/cli/dist/cli.js review owner/repo --provider nim`

---

## Web

```bash
npm run build:core
npm run dev:web
```

Open http://localhost:3000 — paste repo + provider + key → Review.

Optional server NIM demo: `apps/web/.env.local` → `NVIDIA_API_KEY=...`

---

## Useful flags

`--path` `--ext` `--max-files` `--ref` `--out` `--json` `--verbose` `--api-key` `--model` `--base-url`

---

## License

MIT
