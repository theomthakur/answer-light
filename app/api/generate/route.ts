import { NextResponse } from "next/server";
import { getComplaint } from "@/lib/complaints";
import { generateAnswer } from "@/lib/agent/pipeline";
import { renderAnswer } from "@/lib/agent/assemble";
import { hasCredentials, normalizeEnv, activeProvider } from "@/lib/llm/provider";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  normalizeEnv();

  if (!hasCredentials()) {
    return NextResponse.json(
      {
        error: "missing_api_key",
        message:
          activeProvider() === "anthropic"
            ? "Set ANTHROPIC_API_KEY in your environment."
            : "Set GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) in your environment. Free key: https://aistudio.google.com/apikey",
      },
      { status: 400 },
    );
  }

  let body: { complaintId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const complaint = body.complaintId ? getComplaint(body.complaintId) : null;
  if (!complaint) {
    return NextResponse.json(
      { error: "not_found", message: `No complaint with id "${body.complaintId}".` },
      { status: 404 },
    );
  }

  try {
    const result = await generateAnswer(complaint);
    return NextResponse.json({ ...result, rendered: renderAnswer(result.answer) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Free-tier rate/quota limits are expected for an academic demo — surface a
    // friendly, explanatory message instead of a raw provider stack trace.
    if (isRateLimitError(message)) {
      return NextResponse.json(
        {
          error: "rate_limited",
          message:
            "This is an academic / portfolio project running on free AI APIs, " +
            "and the daily free-tier limit has been reached. Please try again " +
            "later (the free quota resets each day). Thanks for understanding!",
          detail: message,
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: "generation_failed", message },
      { status: 500 },
    );
  }
}

/**
 * Detects provider rate-limit / quota-exceeded errors across Gemini and Claude.
 * These bubble up through withRetry as "<step> failed after N attempt(s): ...".
 */
function isRateLimitError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("quota") ||
    m.includes("rate limit") ||
    m.includes("rate-limit") ||
    m.includes("ratelimit") ||
    m.includes("too many requests") ||
    m.includes("resource_exhausted") ||
    m.includes("429")
  );
}
