# coderev walkthrough

This document explains **how the CLI works internally** and **how to use it** day to day.

`coderev` is a local, open-source tool. It does **not** use a database or a backend of yours. It:

1. Reads a **public** GitHub repo over the GitHub API
2. Sends selected file contents to an LLM you configure (Nvidia NIM free tier, or BYOK)
3. Prints a structured review to the terminal (and optionally writes `review.md` / `review.json`)

Keys never leave your machine except when calling the LLM provider you chose.

---

## Big picture

```text
  you
   |
   v
coderev CLI  (Commander)
   |
   +--> resolve provider (NIM / OpenAI / custom)
   |
   +--> GitHub API: resolve branch, list tree, download files
   |
   +--> select + rank + cap files
   |
   +--> chunk into prompt-sized batches
   |
   +--> Vercel AI SDK generateObject (structured JSON via Zod)
   |
   +--> aggregate scores/findings
   |
   +--> terminal summary (+ optional markdown/json files)
```

There is no account system and no stored history. Each run is independent.

---

## Project map (what each folder does)

| Path | Role |
|------|------|
| `apps/cli` | Commander CLI (`init`, `doctor`, `review`) |
| `apps/web` | Next.js UI + `POST /api/review` |
| `packages/core` | Shared GitHub fetch, providers, chunking, structured review, markdown render |
| `packages/core/src/pipeline.ts` | `reviewPublicRepo()` orchestration used by CLI + Web |
| `apps/cli/src/commands/*` | CLI-only UX (doctor/init/write files) |
| `apps/web/components/*` | Browser form + results UI |

---

## How a `review` run works (step by step)

CLI entry is `apps/cli`; shared steps live in `packages/core` (`reviewPublicRepo`). Web uses the same core via `/api/review`.

### 1. Load local config

`dotenv` loads a `.env` file from the current working directory (if present).

CLI flags always win over env when both are set (for key / base URL / model).

### 2. Resolve the LLM provider **first**

Before any GitHub traffic, `resolveProvider()` in `packages/core/src/providers/createModel.ts` builds a model client.

| `--provider` | Key source | Default base URL | Default model |
|--------------|------------|------------------|---------------|
| `nim` | `NVIDIA_API_KEY` or `--api-key` | `https://integrate.api.nvidia.com/v1` | `meta/llama-3.1-8b-instruct` |
| `openai` | `OPENAI_API_KEY` / `API_KEY` | `https://api.openai.com/v1` | `gpt-4o-mini` |
| `custom` | `API_KEY` / `--api-key` | **required** `--base-url` or `BASE_URL` | **required** `--model` or `MODEL` |

All three modes use the same code path: `@ai-sdk/openai` `createOpenAI({ apiKey, baseURL })`.

Nvidia NIM is treated as an OpenAI-compatible HTTP API. BYOK “any agent” means: point `--base-url` at any OpenAI-compatible endpoint (OpenAI, Groq, Ollama, a gateway in front of Anthropic, etc.).

If the key/base URL/model is missing, the CLI exits with a clear error and often tells you to run `coderev doctor`.

### 3. Parse the repo argument

`parseRepoInput()` accepts:

- `owner/repo`
- `https://github.com/owner/repo`
- URLs that include `/tree/<ref>/...` (ref is extracted unless `--ref` overrides)

### 4. Resolve the git ref

- If you passed `--ref` (or the URL contained a tree ref), that is used.
- Otherwise `GET /repos/{owner}/{repo}` returns `default_branch` (often `main`).

Optional `GITHUB_TOKEN` is attached as `Authorization: Bearer …` to raise anonymous rate limits. Public repos only; there is no product path for private repos in v1.

### 5. List the repository tree

`listRepoFiles()` calls:

```text
GET /repos/{owner}/{repo}/git/trees/{ref}?recursive=1
```

It keeps **blob** entries (files) with path, size, and sha. If GitHub marks the tree as `truncated`, you get a warning — results may be incomplete for huge repos.

### 6. Select which files to review

`selectFiles()` applies filters:

- Drop common noise: `node_modules/`, `dist/`, lockfiles, binaries, etc.
- Keep code-ish extensions by default (`ts`, `tsx`, `py`, `go`, …) unless `--ext` is set
- Honor `--path` as a prefix (e.g. `src/`)
- Drop files larger than ~80KB (from the tree size metadata)
- Rank so `src/`, `app/`, `lib/` tend to win over docs/tests when capped
- Cap at `--max-files` (default **40**)

Only **metadata** is filtered here. Contents are not downloaded yet.

### 7. Download file contents

`fetchFileContents()` calls the Contents API per selected path (with limited concurrency):

```text
GET /repos/{owner}/{repo}/contents/{path}?ref={ref}
```

Base64 payloads are decoded to UTF-8. Failures on individual files are skipped (especially with `--verbose`).

### 8. Chunk for the model context window

`chunkFiles()` packs files into batches under a character budget (~24k chars/batch, ~12k chars/file with truncation markers).

Large free-tier / small models cannot swallow a whole monorepo in one prompt, so the review may run multiple LLM calls.

### 9. Structured LLM review per batch

`runReview()` builds a prompt that asks for:

- Scores 0–10: quality, performance, security, architecture
- Findings: severity, category, file, optional line hint, issue, recommendation
- Architecture notes + a short summary

It uses Vercel AI SDK `generateObject()` with the Zod schema in `src/review/schema.ts`. That forces machine-readable JSON shaped like the schema (not free-form prose alone).

Temperature is low (`0.2`) for more consistent reviews.

### 10. Aggregate batches into one report

Across batches the tool:

- Averages scores
- Deduplicates similar findings
- Merges architecture notes
- Joins summaries
- Records which files were reviewed, provider, model, timestamp

### 11. Output

- Always prints a **terminal summary** (scores + top findings)
- If `--out review.md`: full markdown report
- If `--json review.json`: full JSON report

Nothing is uploaded to a coderev server. Files land only where you asked.

---

## How `init` and `doctor` fit in

### `coderev init`

Copies / writes `.env.example` into the current directory and prints the exact follow-up commands (NIM vs BYOK). It does not call GitHub or an LLM.

### `coderev doctor`

Checks:

- Node.js >= 20
- Presence of `NVIDIA_API_KEY`, `OPENAI_API_KEY`, and custom BYOK env trio
- Whether `GITHUB_TOKEN` is set
- Live GitHub rate-limit remaining (`/rate_limit`)

Then prints a suggested next `review` command based on what it found.

Use this before spending tokens on a bad config.

---

## Security & privacy model

- **No DB / no accounts** — config is env, `.env`, or CLI flags.
- **API keys** leave your machine only toward the LLM base URL you configured.
- **GitHub** receives anonymous or token-authenticated read requests for public content.
- Reports are local files if you request them; otherwise only stdout/stderr.
- Do not commit `.env`. `.gitignore` already ignores `.env`, `review.md`, and `review.json`.

---

## How to use

### Prerequisites

- Node.js **20+**
- A public GitHub repo to review
- Either:
  - Nvidia NIM key (free path), or
  - Your own OpenAI / OpenAI-compatible key (BYOK)

### Install from this repo

```bash
npm install
npm run build

# run the built CLI
node dist/cli.js --help

# or during development
npx tsx src/cli.ts --help

# optional: global link
npm link
coderev --help
```

### First-time setup

```bash
# 1) scaffold env template
node dist/cli.js init
# copy to .env and edit, or export vars in your shell

# 2) free path — get a key at https://build.nvidia.com/explore/discover
# PowerShell:
$env:NVIDIA_API_KEY = "nvapi-..."

# bash:
# export NVIDIA_API_KEY=nvapi-...

# 3) validate
node dist/cli.js doctor
```

### Review with Nvidia NIM (free path)

```bash
node dist/cli.js review sindresorhus/is --provider nim --max-files 15

# full URL also works
node dist/cli.js review https://github.com/sindresorhus/is --provider nim
```

### Review with OpenAI BYOK

```bash
$env:OPENAI_API_KEY = "sk-..."
node dist/cli.js review owner/repo --provider openai --model gpt-4o-mini
```

### Review with any OpenAI-compatible endpoint (BYOK custom)

```bash
node dist/cli.js review owner/repo --provider custom `
  --base-url https://api.openai.com/v1 `
  --api-key $env:OPENAI_API_KEY `
  --model gpt-4o-mini
```

Examples of custom base URLs people use:

- OpenAI: `https://api.openai.com/v1`
- Local Ollama (if OpenAI-compatible): `http://localhost:11434/v1`
- Hosted gateways / Groq / etc.: whatever their docs list as the OpenAI-compatible root

### Narrow a large repo (recommended)

```bash
node dist/cli.js review owner/repo `
  --provider nim `
  --path src/ `
  --ext ts,tsx `
  --max-files 40 `
  --ref main `
  --verbose
```

### Save reports to disk

```bash
node dist/cli.js review owner/repo --provider nim `
  --out review.md `
  --json review.json
```

Terminal still gets a summary; files get the full report.

### Discover flags from the CLI itself

```bash
node dist/cli.js --help
node dist/cli.js review --help
node dist/cli.js doctor --help
node dist/cli.js init --help
```

The `--help` text includes the same examples as this walkthrough’s happy path.

---

## Command & flag cheat sheet

| Command | Purpose |
|---------|---------|
| `coderev init` | Write `.env.example` + print next steps |
| `coderev doctor` | Validate Node / keys / GitHub limits |
| `coderev review <repo>` | Run the review pipeline |

| `review` flag | Meaning |
|---------------|---------|
| `-p, --provider` | `nim` \| `openai` \| `custom` (default `nim`) |
| `-m, --model` | Model id override |
| `--base-url` | OpenAI-compatible API root |
| `-k, --api-key` | API key (else env) |
| `--path` | Only files under this prefix |
| `--ext` | Comma-separated extensions |
| `--max-files` | Cap reviewed files (default 40) |
| `--ref` | Branch / tag / commit |
| `-o, --out` | Markdown output path |
| `--json` | JSON output path |
| `-v, --verbose` | Extra progress logs |

Useful env vars: `NVIDIA_API_KEY`, `NVIDIA_BASE_URL`, `NVIDIA_MODEL`, `OPENAI_API_KEY`, `API_KEY`, `BASE_URL`, `MODEL`, `GITHUB_TOKEN`.

---

## What a good first run looks like

1. `doctor` shows Node OK and your NIM (or BYOK) key present.
2. `review` prints `Listing files…` then `Fetching N file(s)…` then `Running review…`.
3. Terminal shows scores like `Quality: x/10 · Performance: …` and a short list of findings.
4. Optional: open `review.md` for the full write-up.

If something fails early:

- Missing key → set env / `--api-key`, re-run `doctor`
- GitHub 403 → set `GITHUB_TOKEN` or wait for rate-limit reset
- No files matched → relax `--path` / `--ext` / `--max-files`
- LLM error → check model id exists on that provider, and that base URL ends with `/v1` when required

---

## Design limits (v1)

- Public GitHub only (no private-repo product flow)
- No web UI, no PR bot, no persistent history
- Tree truncation on very large repos can miss files
- Review quality depends on the model and how tightly you scope `--path` / `--max-files`

For a shorter command-first overview, see [README.md](./README.md).


---

## Web app

The web UI lives in `apps/web` and calls the same pipeline through `POST /api/review`.

### Run

```bash
npm install
npm run build:core
npm run dev:web
```

Open http://localhost:3000

### Request flow

1. Browser form collects repo, provider, optional key, scope filters
2. `fetch('/api/review')` sends JSON (key is **not** saved to localStorage or a DB)
3. API route validates with Zod, calls `reviewPublicRepo()` from `@coderev/core`
4. Response includes structured `report` + `markdown` for download buttons

### Free NIM demo on the server

If the user picks **Nvidia NIM** and leaves the key blank, the API uses `NVIDIA_API_KEY` from `apps/web/.env.local` when present. OpenAI/custom always require a pasted key.

### Where the code lives

| Piece | Path |
|-------|------|
| UI | `apps/web/app/page.tsx`, `components/ReviewApp.tsx` |
| API | `apps/web/app/api/review/route.ts` |
| Shared logic | `packages/core` |
| CLI | `apps/cli` |
