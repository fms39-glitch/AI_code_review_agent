import { config as loadDotenv } from "dotenv";
import {
  fetchFileContents,
  listRepoFiles,
  parseRepoInput,
  resolveDefaultBranch,
} from "../github/fetchRepo.js";
import { resolveProvider, type ProviderName } from "../providers/createModel.js";
import { selectFiles } from "../review/selectFiles.js";
import { runReview } from "../review/runReview.js";
import { renderTerminalSummary } from "../output/renderMarkdown.js";
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

  const provider = resolveProvider({
    provider: options.provider,
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    model: options.model,
  });

  const parsed = parseRepoInput(repoInput, options.ref);
  const repoLabel = `${parsed.owner}/${parsed.repo}`;
  const ref =
    parsed.ref ?? (await resolveDefaultBranch(parsed.owner, parsed.repo));

  if (options.verbose) {
    console.error(
      `Resolved ${repoLabel}@${ref} via ${provider.provider} (${provider.modelId})`,
    );
  }

  console.error(`Listing files for ${repoLabel}@${ref}…`);
  const { files, truncated } = await listRepoFiles(
    parsed.owner,
    parsed.repo,
    ref,
  );
  if (truncated) {
    console.error(
      "Warning: GitHub tree response was truncated; results may be incomplete.",
    );
  }

  const extensions = options.ext
    ? options.ext.split(",").map((e) => e.trim()).filter(Boolean)
    : undefined;
  const maxFiles = options.maxFiles
    ? Number.parseInt(options.maxFiles, 10)
    : undefined;
  if (maxFiles !== undefined && Number.isNaN(maxFiles)) {
    throw new Error(`Invalid --max-files: ${options.maxFiles}`);
  }

  const selected = selectFiles(files, {
    pathPrefix: options.path,
    extensions,
    maxFiles,
  });

  if (selected.length === 0) {
    throw new Error(
      "No files matched filters. Try relaxing --path / --ext / --max-files.",
    );
  }

  console.error(
    `Fetching ${selected.length} file(s) (of ${files.length} blobs)…`,
  );
  const withContent = await fetchFileContents(
    parsed.owner,
    parsed.repo,
    ref,
    selected.map((f) => f.path),
    { verbose: options.verbose },
  );

  if (withContent.length === 0) {
    throw new Error("Failed to download any file contents from GitHub.");
  }

  console.error(
    `Running review with ${provider.provider} / ${provider.modelId}…`,
  );
  const report = await runReview({
    repoLabel,
    ref,
    provider: provider.provider,
    modelId: provider.modelId,
    model: provider.model,
    files: withContent,
    verbose: options.verbose,
  });

  console.log(renderTerminalSummary(report));
  await writeReport({
    report,
    outMarkdown: options.out,
    outJson: options.json,
  });
}
