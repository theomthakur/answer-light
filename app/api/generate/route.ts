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
    return NextResponse.json(
      { error: "generation_failed", message },
      { status: 500 },
    );
  }
}
