import type { RepoFile } from "../github/fetchRepo.js";

export interface FileChunk {
  files: Array<{ path: string; content: string }>;
  estimatedChars: number;
}

/**
 * Pack files into batches under a character budget so prompts stay within
 * typical context windows for free-tier / smaller models.
 */
export function chunkFiles(
  files: RepoFile[],
  options?: { maxCharsPerChunk?: number; maxCharsPerFile?: number },
): FileChunk[] {
  const maxCharsPerChunk = options?.maxCharsPerChunk ?? 24_000;
  const maxCharsPerFile = options?.maxCharsPerFile ?? 12_000;
  const chunks: FileChunk[] = [];
  let current: FileChunk = { files: [], estimatedChars: 0 };

  for (const file of files) {
    if (!file.content) continue;
    let content = file.content;
    if (content.length > maxCharsPerFile) {
      content =
        content.slice(0, maxCharsPerFile) +
        "\n\n/* … truncated for review budget … */\n";
    }

    const cost = content.length + file.path.length + 32;
    if (current.files.length > 0 && current.estimatedChars + cost > maxCharsPerChunk) {
      chunks.push(current);
      current = { files: [], estimatedChars: 0 };
    }

    current.files.push({ path: file.path, content });
    current.estimatedChars += cost;
  }

  if (current.files.length > 0) {
    chunks.push(current);
  }

  return chunks;
}
