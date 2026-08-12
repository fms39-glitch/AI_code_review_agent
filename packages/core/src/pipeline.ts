import {
  fetchFileContents,
  listRepoFiles,
  parseRepoInput,
  resolveDefaultBranch,
} from "./github/fetchRepo.js";
import {
  resolveProvider,
  type ProviderName,
  type ResolvedProvider,
} from "./providers/createModel.js";
import { selectFiles } from "./review/selectFiles.js";
import { runReview } from "./review/runReview.js";
import type { ReviewReport } from "./review/schema.js";

export interface ReviewPublicRepoOptions {
  repo: string;
  ref?: string;
  provider: ProviderName;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  path?: string;
  extensions?: string[];
  maxFiles?: number;
  verbose?: boolean;
  resolved?: ResolvedProvider;
}

export async function reviewPublicRepo(
  options: ReviewPublicRepoOptions,
): Promise<ReviewReport> {
  const provider =
    options.resolved ??
    resolveProvider({
      provider: options.provider,
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      model: options.model,
    });

  const parsed = parseRepoInput(options.repo, options.ref);
  const repoLabel = `${parsed.owner}/${parsed.repo}`;
  const ref =
    parsed.ref ?? (await resolveDefaultBranch(parsed.owner, parsed.repo));

  if (options.verbose) {
    console.error(
      `Resolved ${repoLabel}@${ref} via ${provider.provider} (${provider.modelId})`,
    );
  }

  const { files, truncated } = await listRepoFiles(
    parsed.owner,
    parsed.repo,
    ref,
  );
  if (truncated && options.verbose) {
    console.error(
      "Warning: GitHub tree response was truncated; results may be incomplete.",
    );
  }

  const selected = selectFiles(files, {
    pathPrefix: options.path,
    extensions: options.extensions,
    maxFiles: options.maxFiles,
  });

  if (selected.length === 0) {
    throw new Error(
      "No files matched filters. Try relaxing path / extension / max-files filters.",
    );
  }

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

  return runReview({
    repoLabel,
    ref,
    provider: provider.provider,
    modelId: provider.modelId,
    model: provider.model,
    files: withContent,
    verbose: options.verbose,
  });
}
