import type { Finding, ReviewReport, Scores } from "../review/schema.js";

function scoreLine(scores: Scores): string {
  return [
    `Quality: ${scores.quality}/10`,
    `Performance: ${scores.performance}/10`,
    `Security: ${scores.security}/10`,
    `Architecture: ${scores.architecture}/10`,
  ].join(" · ");
}

function findingBlock(f: Finding): string {
  const where = f.lineHint ? `${f.file}:${f.lineHint}` : f.file;
  return [
    `### [${f.severity.toUpperCase()}] ${f.category} — ${where}`,
    "",
    `**Issue:** ${f.issue}`,
    "",
    `**Recommendation:** ${f.recommendation}`,
    "",
  ].join("\n");
}

export function renderMarkdown(report: ReviewReport): string {
  const lines: string[] = [
    `# Code review: ${report.repo}`,
    "",
    `- **Ref:** \`${report.ref}\``,
    `- **Provider:** ${report.provider}`,
    `- **Model:** \`${report.model}\``,
    `- **Generated:** ${report.generatedAt}`,
    `- **Files reviewed:** ${report.filesReviewed.length}`,
    "",
    "## Scores",
    "",
    scoreLine(report.scores),
    "",
    "## Summary",
    "",
    report.summary,
    "",
  ];

  if (report.architectureNotes.length) {
    lines.push("## Architecture notes", "");
    for (const note of report.architectureNotes) {
      lines.push(`- ${note}`);
    }
    lines.push("");
  }

  lines.push("## Findings", "");
  if (report.findings.length === 0) {
    lines.push("_No findings reported._", "");
  } else {
    for (const f of report.findings) {
      lines.push(findingBlock(f));
    }
  }

  lines.push("## Files reviewed", "");
  for (const p of report.filesReviewed) {
    lines.push(`- \`${p}\``);
  }
  lines.push("");

  return lines.join("\n");
}

export function renderTerminalSummary(report: ReviewReport): string {
  const top = report.findings.slice(0, 8);
  const more =
    report.findings.length > top.length
      ? `\n…and ${report.findings.length - top.length} more findings (see --out / --json).`
      : "";

  const findingLines = top.map(
    (f) =>
      `  [${f.severity}] ${f.category} ${f.file}${f.lineHint ? `:${f.lineHint}` : ""} — ${f.issue}`,
  );

  return [
    `coderev · ${report.repo}@${report.ref}`,
    `provider=${report.provider} model=${report.model} files=${report.filesReviewed.length}`,
    scoreLine(report.scores),
    "",
    report.summary,
    "",
    findingLines.length ? "Top findings:" : "No findings.",
    ...findingLines,
    more,
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}
