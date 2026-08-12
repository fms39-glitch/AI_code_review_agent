import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ReviewReport } from "../review/schema.js";
import { renderMarkdown } from "./renderMarkdown.js";

export async function writeReport(options: {
  report: ReviewReport;
  outMarkdown?: string;
  outJson?: string;
}): Promise<void> {
  const { report, outMarkdown, outJson } = options;

  if (outMarkdown) {
    const abs = path.resolve(outMarkdown);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, renderMarkdown(report), "utf8");
    console.error(`Wrote markdown report → ${abs}`);
  }

  if (outJson) {
    const abs = path.resolve(outJson);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, JSON.stringify(report, null, 2) + "\n", "utf8");
    console.error(`Wrote JSON report → ${abs}`);
  }
}
