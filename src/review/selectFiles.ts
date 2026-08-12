import type { RepoFile } from "../github/fetchRepo.js";

const IGNORE_DIR_PARTS = [
  "node_modules/",
  "vendor/",
  "dist/",
  "build/",
  ".git/",
  ".next/",
  "coverage/",
  "__pycache__/",
  ".venv/",
  "venv/",
  "target/",
  "Pods/",
  ".terraform/",
];

const IGNORE_FILE_NAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "Cargo.lock",
  "Gemfile.lock",
  "poetry.lock",
  "composer.lock",
  ".DS_Store",
]);

const BINARY_EXT = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
  "svg",
  "pdf",
  "zip",
  "gz",
  "tar",
  "7z",
  "rar",
  "woff",
  "woff2",
  "ttf",
  "eot",
  "mp3",
  "mp4",
  "webm",
  "wasm",
  "exe",
  "dll",
  "so",
  "dylib",
  "bin",
  "class",
  "jar",
  "pyc",
]);

const DEFAULT_CODE_EXT = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "go",
  "rs",
  "java",
  "kt",
  "swift",
  "rb",
  "php",
  "cs",
  "cpp",
  "cc",
  "c",
  "h",
  "hpp",
  "vue",
  "svelte",
  "sql",
  "sh",
  "bash",
  "zsh",
  "yml",
  "yaml",
  "toml",
  "json",
  "md",
  "dockerfile",
]);

export interface SelectOptions {
  pathPrefix?: string;
  extensions?: string[];
  maxFiles?: number;
  maxFileBytes?: number;
}

function extOf(path: string): string {
  const base = path.split("/").pop() ?? path;
  if (base.toLowerCase() === "dockerfile") return "dockerfile";
  const i = base.lastIndexOf(".");
  if (i <= 0) return "";
  return base.slice(i + 1).toLowerCase();
}

export function selectFiles(
  files: RepoFile[],
  options: SelectOptions = {},
): RepoFile[] {
  const maxFiles = options.maxFiles ?? 40;
  const maxFileBytes = options.maxFileBytes ?? 80_000;
  const pathPrefix = options.pathPrefix?.replace(/^\/+|\/+$/g, "") ?? "";
  const allowedExt = options.extensions?.length
    ? new Set(options.extensions.map((e) => e.replace(/^\./, "").toLowerCase()))
    : DEFAULT_CODE_EXT;

  const filtered = files.filter((f) => {
    const p = f.path.replace(/\\/g, "/");
    const name = p.split("/").pop() ?? p;

    if (IGNORE_FILE_NAMES.has(name)) return false;
    if (IGNORE_DIR_PARTS.some((d) => p.includes(d))) return false;
    if (pathPrefix && !p.startsWith(pathPrefix + "/") && p !== pathPrefix) {
      return false;
    }

    const ext = extOf(p);
    if (BINARY_EXT.has(ext)) return false;
    if (f.size > maxFileBytes) return false;
    if (ext && !allowedExt.has(ext)) return false;
    if (!ext && !allowedExt.has("dockerfile")) return false;

    return true;
  });

  // Prefer source-like paths over docs/config when truncating
  const ranked = filtered.sort((a, b) => {
    const score = (p: string) => {
      let s = 0;
      if (p.startsWith("src/") || p.startsWith("app/") || p.startsWith("lib/"))
        s += 3;
      if (p.includes("test") || p.includes("spec")) s -= 1;
      if (p.endsWith(".md")) s -= 2;
      return s;
    };
    return score(b.path) - score(a.path) || a.path.localeCompare(b.path);
  });

  return ranked.slice(0, maxFiles);
}
