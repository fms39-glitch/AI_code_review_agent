import { z } from "zod";
import {
  reviewPublicRepo,
  renderMarkdown,
  type ProviderName,
} from "@coderev/core";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  repo: z.string().min(1),
  provider: z.enum(["nim", "openai", "custom"]),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
  path: z.string().optional(),
  ext: z.string().optional(),
  maxFiles: z.number().int().min(1).max(40).optional(),
  ref: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = bodySchema.parse(json);

    const provider = body.provider as ProviderName;
    const apiKey = body.apiKey?.trim() || undefined;

    if (provider !== "nim" && !apiKey) {
      return Response.json(
        {
          error:
            "API key is required for OpenAI and custom providers. Paste your key for this run (it is not stored).",
        },
        { status: 400 },
      );
    }

    if (provider === "nim" && !apiKey && !process.env.NVIDIA_API_KEY?.trim()) {
      return Response.json(
        {
          error:
            "Paste a Nvidia NIM API key, or set NVIDIA_API_KEY on the server for the free demo path.",
        },
        { status: 400 },
      );
    }

    if (provider === "custom") {
      if (!body.baseUrl?.trim() || !body.model?.trim()) {
        return Response.json(
          {
            error:
              "Custom provider requires base URL and model (OpenAI-compatible).",
          },
          { status: 400 },
        );
      }
    }

    const extensions = body.ext
      ? body.ext
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean)
      : undefined;

    const report = await reviewPublicRepo({
      repo: body.repo.trim(),
      provider,
      apiKey,
      baseUrl: body.baseUrl?.trim() || undefined,
      model: body.model?.trim() || undefined,
      path: body.path?.trim() || undefined,
      extensions,
      maxFiles: body.maxFiles ?? 20,
      ref: body.ref?.trim() || undefined,
    });

    return Response.json({
      report,
      markdown: renderMarkdown(report),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.toLowerCase().includes("rate limit") ? 429 : 500;
    return Response.json({ error: message }, { status });
  }
}
