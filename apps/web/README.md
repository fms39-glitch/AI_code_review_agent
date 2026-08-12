# coderev Web

Browser UI for reviewing public GitHub repositories. Uses the same `@coderev/core` pipeline as the CLI. No database.

## Run locally

From the monorepo root:

```bash
npm install
npm run build:core
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000).

Optional server env (`apps/web/.env.local`):

```env
NVIDIA_API_KEY=nvapi-...   # free NIM demo when the UI key is blank
GITHUB_TOKEN=ghp_...       # higher GitHub rate limits
```

## How keys work

- Users can paste NIM / OpenAI / custom keys in the form for **that request only**
- Keys are **not** written to localStorage or a database
- For NIM, if the UI key is blank, the API falls back to server `NVIDIA_API_KEY`
