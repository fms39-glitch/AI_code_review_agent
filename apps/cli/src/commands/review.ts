import { config as loadDotenv } from "dotenv";
import {
  reviewPublicRepo,
  renderTerminalSummary,
  type ProviderName,
} from "@coderev/core";
import { writeReport } from "../output/writeReport.js";

export interface ReviewCommandOptions {
  provider: ProviderName;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  path?: string;
  ext?: string;
  maxFiles?: string;
  ref?: string;
  out?: string;
  json?: string;
  verbose?: boolean;
}

export async function runReviewCommand(
  repoInput: string,
  options: ReviewCommandOptions,
): Promise<void> {
  loadDotenv();

  const extensions = options.ext
    ? options.ext
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
    : undefined;
  const maxFiles = options.maxFiles
    ? Number.parseInt(options.maxFiles, 10)
    : undefined;
  if (maxFiles !== undefined && Number.isNaN(maxFiles)) {
    throw new Error(`Invalid --max-files: ${options.maxFiles}`);
  }

  console.error(`Running review for ${repoInput}…`);
  const report = await reviewPublicRepo({
    repo: repoInput,
    ref: options.ref,
    provider: options.provider,
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    model: options.model,
    path: options.path,
    extensions,
    maxFiles,
    verbose: options.verbose,
  });

  console.log(renderTerminalSummary(report));
  await writeReport({
    report,
    outMarkdown: options.out,
    outJson: options.json,
  });
}
