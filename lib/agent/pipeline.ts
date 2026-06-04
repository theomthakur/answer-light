import { normalizeEnv, modelId } from "../llm/provider";
import type { Complaint, AnswerDocument, GenerationResult } from "../schemas";
import { classifyAllegations } from "./classify";
import { proposeDefenses } from "./defenses";
import { defendantPrayer } from "./assemble";
import { computeDeadline } from "./deadlines";
import { validateGrounding } from "./validate";
import { reconcileResponses } from "./reconcile";

/**
 * Orchestrates the Complaint -> Answer pipeline:
 *
 *   classify (LLM)  ─┐
 *                    ├─> reconcile (deterministic, self-healing)
 *   defenses (LLM)  ─┘        │
 *                             ├─> assemble (deterministic) -> validate (deterministic)
 *   deadline (deterministic) ─┘
 *
 * classify and defenses are independent, so they run concurrently. The LLM is
 * only trusted with judgment; grounding, repair, deadlines, and assembly are
 * deterministic so the output can never be silently incomplete or ungrounded.
 */
export async function generateAnswer(
  complaint: Complaint,
): Promise<GenerationResult> {
  normalizeEnv();
  const timings: Record<string, number> = {};

  const t0 = Date.now();
  const [responsesRaw, defenses] = await Promise.all([
    time(timings, "classify", () => classifyAllegations(complaint)),
    time(timings, "defenses", () => proposeDefenses(complaint)),
  ]);
  timings.llm_total = Date.now() - t0;

  // Deterministic self-healing: guarantees one grounded response per allegation.
  const { responses, repairs } = reconcileResponses(complaint, responsesRaw);
  const deadline = computeDeadline(complaint.caption);

  const answer: AnswerDocument = {
    complaintId: complaint.id,
    caption: complaint.caption,
    responses,
    affirmativeDefenses: defenses,
    prayer: defendantPrayer(),
    deadline,
    generatedAt: new Date().toISOString(),
    model: modelId(),
  };

  // After reconciliation this should be error-free; repairs surface as warnings.
  const issues = [...validateGrounding(complaint, responses), ...repairs];

  return { answer, issues, timings };
}

async function time<T>(
  bucket: Record<string, number>,
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    bucket[key] = Date.now() - start;
  }
}
