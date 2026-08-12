import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV1 } from "ai";

export type ProviderName = "nim" | "openai" | "custom";

export interface ProviderOptions {
  provider: ProviderName;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const NIM_DEFAULT_MODEL = "meta/llama-3.1-8b-instruct";
export const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";

export interface ResolvedProvider {
  model: LanguageModelV1;
  provider: ProviderName;
  modelId: string;
  baseUrl: string;
  apiKeySource: string;
}

function requireValue(value: string | undefined, message: string): string {
  if (!value?.trim()) {
    throw new Error(message);
  }
  return value.trim();
}

export function resolveProvider(options: ProviderOptions): ResolvedProvider {
  const provider = options.provider;

  if (provider === "nim") {
    const apiKey = requireValue(
      options.apiKey ?? process.env.NVIDIA_API_KEY,
      "Missing Nvidia NIM API key. Set NVIDIA_API_KEY or pass --api-key.\nGet a free key: https://build.nvidia.com/explore/discover\nThen run: coderev doctor",
    );
    const baseUrl = (
      options.baseUrl ??
      process.env.NVIDIA_BASE_URL ??
      NIM_BASE_URL
    ).replace(/\/$/, "");
    const modelId =
      options.model ?? process.env.NVIDIA_MODEL ?? NIM_DEFAULT_MODEL;
    const client = createOpenAI({ apiKey, baseURL: baseUrl });
    return {
      model: client(modelId),
      provider,
      modelId,
      baseUrl,
      apiKeySource: options.apiKey ? "--api-key" : "NVIDIA_API_KEY",
    };
  }

  if (provider === "openai") {
    const apiKey = requireValue(
      options.apiKey ?? process.env.OPENAI_API_KEY ?? process.env.API_KEY,
      "Missing OpenAI API key. Set OPENAI_API_KEY or pass --api-key.",
    );
    const baseUrl = (
      options.baseUrl ??
      process.env.OPENAI_BASE_URL ??
      process.env.BASE_URL ??
      "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    const modelId =
      options.model ??
      process.env.OPENAI_MODEL ??
      process.env.MODEL ??
      OPENAI_DEFAULT_MODEL;
    const client = createOpenAI({ apiKey, baseURL: baseUrl });
    return {
      model: client(modelId),
      provider,
      modelId,
      baseUrl,
      apiKeySource: options.apiKey
        ? "--api-key"
        : process.env.OPENAI_API_KEY
          ? "OPENAI_API_KEY"
          : "API_KEY",
    };
  }

  // custom — any OpenAI-compatible endpoint
  const apiKey = requireValue(
    options.apiKey ?? process.env.API_KEY ?? process.env.OPENAI_API_KEY,
    "Missing API key for custom provider. Pass --api-key or set API_KEY.",
  );
  const baseUrl = requireValue(
    options.baseUrl ?? process.env.BASE_URL ?? process.env.OPENAI_BASE_URL,
    "Missing base URL for custom provider. Pass --base-url or set BASE_URL.\nExample: --base-url https://api.openai.com/v1",
  ).replace(/\/$/, "");
  const modelId = requireValue(
    options.model ?? process.env.MODEL ?? process.env.OPENAI_MODEL,
    "Missing model for custom provider. Pass --model or set MODEL.\nExample: --model gpt-4o-mini",
  );
  const client = createOpenAI({ apiKey, baseURL: baseUrl });
  return {
    model: client(modelId),
    provider,
    modelId,
    baseUrl,
    apiKeySource: options.apiKey ? "--api-key" : "API_KEY/OPENAI_API_KEY",
  };
}

export function maskSecret(secret: string): string {
  if (secret.length <= 8) return "****";
  return `${secret.slice(0, 4)}…${secret.slice(-4)}`;
}
