"use client";

import { useMemo, useState } from "react";
import type { ReviewReport } from "@coderev/core";
import { ReviewResults } from "./ReviewResults";

type Provider = "nim" | "openai" | "custom";

export function ReviewApp() {
  const [repo, setRepo] = useState("");
  const [provider, setProvider] = useState<Provider>("nim");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("");
  const [path, setPath] = useState("");
  const [ext, setExt] = useState("ts,tsx,js,jsx,py");
  const [maxFiles, setMaxFiles] = useState(20);
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReviewReport | null>(null);
  const [markdown, setMarkdown] = useState<string | null>(null);

  const showCustom = provider === "custom";
  const keyHint = useMemo(() => {
    if (provider === "nim") {
      return "Optional if the server has NVIDIA_API_KEY. Otherwise paste your NIM key for this run.";
    }
    if (provider === "openai") return "Required. Sent only with this request — not stored.";
    return "Required with base URL + model. Sent only with this request — not stored.";
  }, [provider]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReport(null);
    setMarkdown(null);

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo,
          provider,
          apiKey: apiKey || undefined,
          baseUrl: showCustom ? baseUrl : undefined,
          model: model || undefined,
          path: path || undefined,
          ext: ext || undefined,
          maxFiles,
          ref: ref || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setReport(data.report);
      setMarkdown(data.markdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      <form onSubmit={onSubmit} className="space-y-6">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-sand-100">
            Public GitHub repository
          </span>
          <input
            required
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo or https://github.com/owner/repo"
            className="w-full border-b border-teal-400/40 bg-transparent px-0 py-3 text-lg text-sand-100 outline-none placeholder:text-sand-300/40 focus:border-teal-300"
          />
        </label>

        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-sand-100">Provider</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              className="w-full border border-white/10 bg-ink-800/80 px-3 py-2.5 text-sand-100 outline-none focus:border-teal-400/50"
            >
              <option value="nim">Nvidia NIM (free / demo)</option>
              <option value="openai">OpenAI (BYOK)</option>
              <option value="custom">Custom OpenAI-compatible (BYOK)</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-sand-100">API key</span>
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === "nim" ? "nvapi-… (optional)" : "sk-…"}
              className="w-full border border-white/10 bg-ink-800/80 px-3 py-2.5 text-sand-100 outline-none focus:border-teal-400/50"
            />
            <span className="block text-xs text-sand-300/70">{keyHint}</span>
          </label>
        </div>

        {showCustom && (
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-sand-100">Base URL</span>
              <input
                required={showCustom}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full border border-white/10 bg-ink-800/80 px-3 py-2.5 text-sand-100 outline-none focus:border-teal-400/50"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-sand-100">Model</span>
              <input
                required={showCustom}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o-mini"
                className="w-full border border-white/10 bg-ink-800/80 px-3 py-2.5 text-sand-100 outline-none focus:border-teal-400/50"
              />
            </label>
          </div>
        )}

        {!showCustom && (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-sand-100">
              Model override (optional)
            </span>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={
                provider === "nim"
                  ? "meta/llama-3.1-8b-instruct"
                  : "gpt-4o-mini"
              }
              className="w-full border border-white/10 bg-ink-800/80 px-3 py-2.5 text-sand-100 outline-none focus:border-teal-400/50"
            />
          </label>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-sand-100">Path</span>
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="src/"
              className="w-full border border-white/10 bg-ink-800/80 px-3 py-2.5 text-sand-100 outline-none focus:border-teal-400/50"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-sand-100">Extensions</span>
            <input
              value={ext}
              onChange={(e) => setExt(e.target.value)}
              className="w-full border border-white/10 bg-ink-800/80 px-3 py-2.5 text-sand-100 outline-none focus:border-teal-400/50"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-sand-100">Max files</span>
            <input
              type="number"
              min={1}
              max={40}
              value={maxFiles}
              onChange={(e) => setMaxFiles(Number(e.target.value) || 20)}
              className="w-full border border-white/10 bg-ink-800/80 px-3 py-2.5 text-sand-100 outline-none focus:border-teal-400/50"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-sand-100">Ref</span>
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="main"
              className="w-full border border-white/10 bg-ink-800/80 px-3 py-2.5 text-sand-100 outline-none focus:border-teal-400/50"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !repo.trim()}
          className="group relative mt-2 inline-flex items-center justify-center overflow-hidden bg-teal-400 px-8 py-3 text-sm font-semibold tracking-wide text-ink-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="absolute inset-0 translate-y-full bg-white/25 transition duration-300 group-hover:translate-y-0" />
          <span className="relative">
            {loading ? "Reviewing…" : "Review repository"}
          </span>
        </button>
      </form>

      {error && (
        <p className="border-l-2 border-red-400/80 bg-red-950/30 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      )}

      {report && markdown && (
        <ReviewResults report={report} markdown={markdown} />
      )}
    </div>
  );
}
