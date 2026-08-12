export interface RepoFile {
  path: string;
  size: number;
  sha: string;
  content?: string;
}

export interface ParsedRepo {
  owner: string;
  repo: string;
  ref?: string;
}

const GITHUB_API = "https://api.github.com";

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "coderev-cli",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function parseRepoInput(input: string, refFlag?: string): ParsedRepo {
  const trimmed = input.trim().replace(/\/$/, "");

  // https://github.com/owner/repo[.git][/tree/ref/...]
  const urlMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/(?:tree|blob)\/([^/]+))?/i,
  );
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2],
      ref: refFlag ?? urlMatch[3],
    };
  }

  // owner/repo
  const short = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (short) {
    return { owner: short[1], repo: short[2], ref: refFlag };
  }

  throw new Error(
    `Invalid repo "${input}". Use owner/repo or https://github.com/owner/repo`,
  );
}

async function githubJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 404) {
      throw new Error(
        `GitHub 404 for ${url}. Is the repo public and the path/ref correct?`,
      );
    }
    if (res.status === 403) {
      throw new Error(
        `GitHub rate limit or forbidden (${res.status}). Set GITHUB_TOKEN for higher limits.\n${body.slice(0, 200)}`,
      );
    }
    throw new Error(`GitHub API error ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export async function resolveDefaultBranch(
  owner: string,
  repo: string,
): Promise<string> {
  const data = await githubJson<{ default_branch: string }>(
    `${GITHUB_API}/repos/${owner}/${repo}`,
  );
  return data.default_branch;
}

interface TreeEntry {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
  url: string;
}

interface TreeResponse {
  sha: string;
  truncated: boolean;
  tree: TreeEntry[];
}

export async function listRepoFiles(
  owner: string,
  repo: string,
  ref: string,
): Promise<{ files: RepoFile[]; truncated: boolean; resolvedRef: string }> {
  const tree = await githubJson<TreeResponse>(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
  );

  const files: RepoFile[] = tree.tree
    .filter((e) => e.type === "blob")
    .map((e) => ({
      path: e.path,
      size: e.size ?? 0,
      sha: e.sha,
    }));

  return { files, truncated: tree.truncated, resolvedRef: ref };
}

export async function fetchFileContents(
  owner: string,
  repo: string,
  ref: string,
  paths: string[],
  options?: { concurrency?: number; verbose?: boolean },
): Promise<RepoFile[]> {
  const concurrency = options?.concurrency ?? 8;
  const results: RepoFile[] = [];
  let index = 0;

  async function worker() {
    while (index < paths.length) {
      const current = index++;
      const path = paths[current];
      const encodedPath = path
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`;
      try {
        const data = await githubJson<{
          path: string;
          size: number;
          sha: string;
          encoding: string;
          content?: string;
          download_url?: string | null;
        }>(url);

        let content = "";
        if (data.encoding === "base64" && data.content) {
          content = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString(
            "utf8",
          );
        } else if (data.download_url) {
          const res = await fetch(data.download_url, {
            headers: githubHeaders(),
          });
          if (!res.ok) {
            throw new Error(`download failed ${res.status}`);
          }
          content = await res.text();
        }

        results.push({
          path: data.path,
          size: data.size,
          sha: data.sha,
          content,
        });
        if (options?.verbose) {
          console.error(`  fetched ${data.path}`);
        }
      } catch (err) {
        if (options?.verbose) {
          console.error(
            `  skip ${path}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, paths.length) }, () => worker()),
  );

  return results.sort((a, b) => a.path.localeCompare(b.path));
}

export async function checkGitHubRateLimit(): Promise<{
  limit: number;
  remaining: number;
  reset: Date;
}> {
  const res = await fetch(`${GITHUB_API}/rate_limit`, {
    headers: githubHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Could not check GitHub rate limit (${res.status})`);
  }
  const data = (await res.json()) as {
    resources: { core: { limit: number; remaining: number; reset: number } };
  };
  const core = data.resources.core;
  return {
    limit: core.limit,
    remaining: core.remaining,
    reset: new Date(core.reset * 1000),
  };
}
