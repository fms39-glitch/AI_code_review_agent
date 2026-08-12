import { config as loadDotenv } from "dotenv";
import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runDoctor } from "./commands/doctor.js";
import { runReviewCommand } from "./commands/review.js";
import type { ProviderName } from "./providers/createModel.js";

loadDotenv();

const program = new Command();

program
  .name("coderev")
  .description(
    `Open-source CLI to review public GitHub repositories with an LLM.

No database. Keys stay on your machine (env / flags / local .env).

Providers:
  nim     Free Nvidia NIM (OpenAI-compatible) — set NVIDIA_API_KEY
  openai  BYOK OpenAI — set OPENAI_API_KEY
  custom  BYOK any OpenAI-compatible API — --base-url --api-key --model

Quick start:
  coderev init
  export NVIDIA_API_KEY=nvapi-...
  coderev doctor
  coderev review owner/repo --provider nim`,
  )
  .version("0.1.0");

program
  .command("init")
  .description(
    "Write .env.example in the current directory and print next commands",
  )
  .addHelpText(
    "after",
    `
Examples:
  $ coderev init
  $ cp .env.example .env
  $ export NVIDIA_API_KEY=nvapi-...
  $ coderev doctor
`,
  )
  .action(async () => {
    await runInit();
  });

program
  .command("doctor")
  .description(
    "Check Node version, API keys, and GitHub rate limits; print next steps",
  )
  .option(
    "-p, --provider <name>",
    "Preferred provider for the suggested next command (nim|openai|custom)",
    "nim",
  )
  .addHelpText(
    "after",
    `
Examples:
  $ coderev doctor
  $ coderev doctor --provider custom
`,
  )
  .action(async (opts: { provider: string }) => {
    await runDoctor({ provider: opts.provider });
  });

program
  .command("review")
  .description(
    "Fetch a public GitHub repo and produce structured code/architecture review",
  )
  .argument(
    "<repo>",
    "Public repo as owner/repo or https://github.com/owner/repo",
  )
  .option(
    "-p, --provider <name>",
    "LLM provider: nim | openai | custom",
    "nim",
  )
  .option("-m, --model <id>", "Model id (overrides provider default / env)")
  .option(
    "--base-url <url>",
    "OpenAI-compatible base URL (required for custom unless BASE_URL is set)",
  )
  .option(
    "-k, --api-key <key>",
    "API key (otherwise read from provider env var)",
  )
  .option("--path <prefix>", "Only include files under this path prefix")
  .option(
    "--ext <list>",
    "Comma-separated extensions to include (e.g. ts,tsx,py)",
  )
  .option("--max-files <n>", "Max files to review", "40")
  .option("--ref <ref>", "Branch, tag, or commit SHA (default: default branch)")
  .option("-o, --out <file>", "Write markdown report to this path")
  .option("--json <file>", "Write JSON report to this path")
  .option("-v, --verbose", "Verbose logging", false)
  .addHelpText(
    "after",
    `
Examples:
  # Free Nvidia NIM
  $ export NVIDIA_API_KEY=nvapi-...
  $ coderev review sindresorhus/is --provider nim --max-files 15

  # BYOK OpenAI
  $ coderev review owner/repo --provider openai --model gpt-4o-mini

  # BYOK any OpenAI-compatible endpoint (Groq, Ollama, gateway, …)
  $ coderev review owner/repo --provider custom \\
      --base-url https://api.openai.com/v1 \\
      --api-key "$OPENAI_API_KEY" \\
      --model gpt-4o-mini

  # Narrow scope + save reports
  $ coderev review owner/repo --path src/ --ext ts,tsx --out review.md --json review.json

Env:
  NVIDIA_API_KEY, OPENAI_API_KEY, API_KEY, BASE_URL, MODEL, GITHUB_TOKEN
`,
  )
  .action(async (repo: string, opts) => {
    const provider = String(opts.provider).toLowerCase() as ProviderName;
    if (!["nim", "openai", "custom"].includes(provider)) {
      throw new Error(
        `Unknown provider "${opts.provider}". Use nim | openai | custom.`,
      );
    }
    await runReviewCommand(repo, {
      provider,
      model: opts.model,
      baseUrl: opts.baseUrl,
      apiKey: opts.apiKey,
      path: opts.path,
      ext: opts.ext,
      maxFiles: opts.maxFiles,
      ref: opts.ref,
      out: opts.out,
      json: opts.json,
      verbose: Boolean(opts.verbose),
    });
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\nError: ${message}\n`);
  process.exitCode = 1;
});
