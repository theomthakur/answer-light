import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

/**
 * Provider-agnostic model selection.
 *
 * Why this exists: the demo runs on Google Gemini's free tier (no card required),
 * but Glade's stack is built on Claude. By routing every agent step through a
 * single factory, swapping the whole pipeline to Claude is a one-line / one-env
 * change — nothing in lib/agent/* knows or cares which provider is live.
 *
 *   LLM_PROVIDER=google   -> gemini-2.5-flash   (default; free tier)
 *   LLM_PROVIDER=anthropic -> claude-sonnet-4-6 (Glade-native)
 */

export type ProviderName = "google" | "anthropic";

const DEFAULTS: Record<ProviderName, string> = {
  google: "gemini-2.5-flash",
  anthropic: "claude-sonnet-4-6",
};

export function activeProvider(): ProviderName {
  const p = (process.env.LLM_PROVIDER ?? "google").toLowerCase();
  return p === "anthropic" ? "anthropic" : "google";
}

export function modelId(): string {
  const provider = activeProvider();
  return process.env.LLM_MODEL ?? DEFAULTS[provider];
}

/** The model handle passed to the Vercel AI SDK's generateObject/generateText. */
export function getModel(): LanguageModel {
  const provider = activeProvider();
  const id = modelId();
  return provider === "anthropic" ? anthropic(id) : google(id);
}

/** True when the required API key for the active provider is present. */
export function hasCredentials(): boolean {
  return activeProvider() === "anthropic"
    ? Boolean(process.env.ANTHROPIC_API_KEY)
    : Boolean(
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY,
      );
}

/**
 * The AI SDK's Google provider reads GOOGLE_GENERATIVE_AI_API_KEY. People who
 * grabbed a key from AI Studio often have it as GEMINI_API_KEY — normalize so
 * either works without a footgun.
 */
export function normalizeEnv(): void {
  if (
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
    process.env.GEMINI_API_KEY
  ) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;
  }
}
