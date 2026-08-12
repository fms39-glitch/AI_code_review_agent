import { generateObject } from "ai";
import type { LanguageModelV1 } from "ai";
import { chunkFiles } from "./chunk.js";
import {
  batchReviewSchema,
  type BatchReview,
  type Finding,
  type ReviewReport,
  type Scores,
} from "./schema.js";
import type { RepoFile } from "../github/fetchRepo.js";

export interface RunReviewInput {
  repoLabel: string;
  ref: string;
  provider: string;
  modelId: string;
  model: LanguageModelV1;
  files: RepoFile[];
  verbose?: boolean;
}

function avgScores(batches: BatchReview[]): Scores {
  if (batches.length === 0) {
    return { quality: 0, performance: 0, security: 0, architecture: 0 };
  }
  const sum: Scores = {
    quality: 0,
    performance: 0,
    security: 0,
    architecture: 0,
  };
  for (const b of batches) {
    sum.quality += b.scores.quality;
    sum.performance += b.scores.performance;
    sum.security += b.scores.security;
    sum.architecture += b.scores.architecture;
  }
  const n = batches.length;
  const round = (x: number) => Math.round((x / n) * 10) / 10;
  return {
    quality: round(sum.quality),
    performance: round(sum.performance),
    security: round(sum.security),
    architecture: round(sum.architecture),
  };
}

function severityRank(s: Finding["severity"]): number {
  switch (s) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
    default:
      return 4;
  }
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const f of findings) {
    const key = `${f.severity}|${f.category}|${f.file}|${f.issue}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out.sort(
    (a, b) =>
      severityRank(a.severity) - severityRank(b.severity) ||
      a.file.localeCompare(b.file),
  );
}

function buildPrompt(
  repoLabel: string,
  ref: string,
  batchIndex: number,
  batchCount: number,
  files: Array<{ path: string; content: string }>,
): string {
  const fileBlocks = files
    .map(
      (f) =>
        `### FILE: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``,
    )
    .join("\n\n");

  return `You are an expert code and architecture reviewer.

Review public GitHub repository "${repoLabel}" at ref "${ref}".
This is batch ${batchIndex + 1} of ${batchCount}.

Score each dimension from 0 (worst) to 10 (best):
- quality: readability, maintainability, tests/docs signals
- performance: hotspots, wasteful patterns, scalability risks
- security: injection, secrets, authz, unsafe defaults
- architecture: coupling, boundaries, consistency

Return structured findings with severity and concrete recommendations.
Prefer actionable issues over style nitpicks. If something looks fine, say so briefly in summary.

Files:
${fileBlocks}`;
}

export async function runReview(input: RunReviewInput): Promise<ReviewReport> {
  const chunks = chunkFiles(input.files);
  if (chunks.length === 0) {
    throw new Error(
      "No file contents available to review. Try different --path / --ext filters.",
    );
  }

  const batches: BatchReview[] = [];

  for (let i = 0; i < chunks.length; i++) {
    if (input.verbose) {
      console.error(
        `Reviewing batch ${i + 1}/${chunks.length} (${chunks[i].files.length} files)…`,
      );
    }

    const { object } = await generateObject({
      model: input.model,
      schema: batchReviewSchema,
      prompt: buildPrompt(
        input.repoLabel,
        input.ref,
        i,
        chunks.length,
        chunks[i].files,
      ),
      temperature: 0.2,
    });

    batches.push(object);
  }

  const findings = dedupeFindings(batches.flatMap((b) => b.findings));
  const architectureNotes = [
    ...new Set(batches.flatMap((b) => b.architectureNotes)),
  ];
  const summary =
    batches.length === 1
      ? batches[0].summary
      : batches.map((b, i) => `Batch ${i + 1}: ${b.summary}`).join("\n");

  return {
    repo: input.repoLabel,
    ref: input.ref,
    provider: input.provider,
    model: input.modelId,
    filesReviewed: input.files.map((f) => f.path),
    scores: avgScores(batches),
    findings,
    architectureNotes,
    summary,
    generatedAt: new Date().toISOString(),
  };
}
