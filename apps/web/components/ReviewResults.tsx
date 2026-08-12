"use client";

import type { ReviewReport } from "@coderev/core";

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const severityColor: Record<string, string> = {
  critical: "text-red-300",
  high: "text-orange-300",
  medium: "text-amber-200",
  low: "text-sand-300",
  info: "text-teal-300",
};

export function ReviewResults({
  report,
  markdown,
}: {
  report: ReviewReport;
  markdown: string;
}) {
  const scores = [
    ["Quality", report.scores.quality],
    ["Performance", report.scores.performance],
    ["Security", report.scores.security],
    ["Architecture", report.scores.architecture],
  ] as const;

  return (
    <section className="space-y-8 border-t border-white/10 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-sand-100">
            {report.repo}
            <span className="text-sand-300">@{report.ref}</span>
          </h2>
          <p className="mt-2 text-sm text-sand-300">
            {report.provider} · {report.model} · {report.filesReviewed.length}{" "}
            files
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => download("review.md", markdown, "text/markdown")}
            className="border border-teal-400/40 px-4 py-2 text-sm text-teal-300 transition hover:border-teal-300 hover:text-teal-200"
          >
            Download MD
          </button>
          <button
            type="button"
            onClick={() =>
              download(
                "review.json",
                JSON.stringify(report, null, 2),
                "application/json",
              )
            }
            className="border border-teal-400/40 px-4 py-2 text-sm text-teal-300 transition hover:border-teal-300 hover:text-teal-200"
          >
            Download JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {scores.map(([label, value]) => (
          <div key={label} className="border-b border-white/10 pb-3">
            <p className="text-xs uppercase tracking-wider text-sand-300">
              {label}
            </p>
            <p className="mt-1 font-display text-3xl text-teal-300">
              {value}
              <span className="text-lg text-sand-300">/10</span>
            </p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-sand-300">
          Summary
        </h3>
        <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-sand-100">
          {report.summary}
        </p>
      </div>

      {report.architectureNotes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-sand-300">
            Architecture notes
          </h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sand-100">
            {report.architectureNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-sand-300">
          Findings ({report.findings.length})
        </h3>
        <ul className="mt-4 space-y-5">
          {report.findings.length === 0 && (
            <li className="text-sand-300">No findings reported.</li>
          )}
          {report.findings.map((f, i) => (
            <li key={`${f.file}-${i}`} className="border-l border-white/15 pl-4">
              <p className={`text-sm font-semibold ${severityColor[f.severity] ?? "text-sand-100"}`}>
                [{f.severity}] {f.category} — {f.file}
                {f.lineHint ? `:${f.lineHint}` : ""}
              </p>
              <p className="mt-1 text-sand-100">{f.issue}</p>
              <p className="mt-1 text-sm text-sand-300">
                {f.recommendation}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
