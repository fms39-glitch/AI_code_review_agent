import {
  NIM_BASE_URL,
  NIM_DEFAULT_MODEL,
  OPENAI_DEFAULT_MODEL,
} from "../providers/createModel.js";
import { checkGitHubRateLimit } from "../github/fetchRepo.js";

function check(ok: boolean, label: string, hint?: string): void {
  const mark = ok ? "OK" : "MISSING";
  console.log(`  [${mark}] ${label}`);
  if (!ok && hint) {
    console.log(`         → ${hint}`);
  }
}

export async function runDoctor(options?: {
  provider?: string;
}): Promise<void> {
  const provider = options?.provider ?? "nim";
  console.log("coderev doctor\n");

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  check(
    nodeMajor >= 20,
    `Node.js ${process.versions.node}`,
    "Install Node.js 20+: https://nodejs.org/",
  );

  console.log("\nProviders");
  const nimKey = Boolean(process.env.NVIDIA_API_KEY?.trim());
  check(
    nimKey,
    "NVIDIA_API_KEY (Nvidia NIM free path)",
    "export NVIDIA_API_KEY=nvapi-...  # https://build.nvidia.com/explore/discover",
  );
  console.log(`         default base: ${NIM_BASE_URL}`);
  console.log(`         default model: ${NIM_DEFAULT_MODEL}`);

  const openaiKey = Boolean(process.env.OPENAI_API_KEY?.trim());
  check(
    openaiKey,
    "OPENAI_API_KEY (BYOK OpenAI)",
    "export OPENAI_API_KEY=sk-...   or use --provider custom",
  );
  console.log(`         default model: ${OPENAI_DEFAULT_MODEL}`);

  const customKey = Boolean(
    process.env.API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim(),
  );
  const customBase = Boolean(
    process.env.BASE_URL?.trim() || process.env.OPENAI_BASE_URL?.trim(),
  );
  const customModel = Boolean(
    process.env.MODEL?.trim() || process.env.OPENAI_MODEL?.trim(),
  );
  check(
    customKey && customBase && customModel,
    "Custom BYOK env (API_KEY + BASE_URL + MODEL)",
    "Set all three, or pass --api-key --base-url --model on the CLI",
  );

  console.log("\nGitHub");
  const ghToken = Boolean(process.env.GITHUB_TOKEN?.trim());
  check(
    true,
    ghToken
      ? "GITHUB_TOKEN set (higher rate limits)"
      : "GITHUB_TOKEN not set (anonymous public API limits)",
    ghToken
      ? undefined
      : "Optional: export GITHUB_TOKEN=ghp_... for more requests/hour",
  );

  try {
    const rl = await checkGitHubRateLimit();
    console.log(
      `  [OK] Rate limit: ${rl.remaining}/${rl.limit} remaining (resets ${rl.reset.toISOString()})`,
    );
  } catch (err) {
    console.log(
      `  [WARN] Could not query rate limit: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  console.log("\nSuggested next command");
  if (provider === "openai" && openaiKey) {
    console.log(
      "  coderev review owner/repo --provider openai --model gpt-4o-mini",
    );
  } else if (provider === "custom" && customKey && customBase && customModel) {
    console.log(
      "  coderev review owner/repo --provider custom --base-url \"$BASE_URL\" --model \"$MODEL\"",
    );
  } else if (nimKey) {
    console.log("  coderev review owner/repo --provider nim");
  } else {
    console.log("  coderev init");
    console.log("  # then set NVIDIA_API_KEY and run: coderev doctor");
  }
  console.log("");
}
