import { copyFile, access, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { constants } from "node:fs";

async function exists(p: string): Promise<boolean> {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function packageRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  if (path.basename(here) === "commands") {
    return path.resolve(here, "../..");
  }
  return path.resolve(here, "..");
}

const ENV_TEMPLATE = `# Nvidia NIM (free)
NVIDIA_API_KEY=nvapi-your-key-here

# Optional BYOK
# OPENAI_API_KEY=sk-...
# API_KEY=
# BASE_URL=https://api.openai.com/v1
# MODEL=gpt-4o-mini

# Optional GitHub rate limit boost
# GITHUB_TOKEN=ghp_...
`;

export async function runInit(): Promise<void> {
  const root = packageRoot();
  const exampleSrc = path.join(root, ".env.example");
  const dest = path.resolve(process.cwd(), ".env.example");

  if (await exists(dest)) {
    console.log(`.env.example already exists at ${dest}`);
  } else if (await exists(exampleSrc)) {
    await copyFile(exampleSrc, dest);
    console.log(`Wrote ${dest}`);
  } else {
    await writeFile(dest, ENV_TEMPLATE, "utf8");
    console.log(`Wrote ${dest}`);
  }

  console.log(`
Next steps:

  1. Copy .env.example → .env and add a key
       cp .env.example .env

  2. Free path (Nvidia NIM):
       # get a key at https://build.nvidia.com/explore/discover
       export NVIDIA_API_KEY=nvapi-...
       coderev doctor
       coderev review owner/repo --provider nim

  3. BYOK (any OpenAI-compatible API):
       coderev review owner/repo --provider custom \\
         --base-url https://api.openai.com/v1 \\
         --api-key "$OPENAI_API_KEY" \\
         --model gpt-4o-mini

  4. Web UI (from repo root):
       npm run dev:web

  5. See all flags:
       coderev review --help
`);
}
