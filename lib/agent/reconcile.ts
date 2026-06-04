import type {
  Complaint,
  AllegationResponse,
  AllegationType,
  ResponseType,
  ValidationIssue,
} from "../schemas";

/**
 * Self-healing reconciliation between the complaint and the model's responses.
 *
 * The grounding contract (every allegation answered exactly once, no invented
 * paragraphs) must ALWAYS hold in the output — so rather than just detecting
 * violations, we repair them deterministically:
 *
 *   - Extra / duplicate response for a paragraph  -> keep the first, drop the rest.
 *   - Response to a paragraph that doesn't exist   -> drop it (hallucination).
 *   - Missing response for a real paragraph        -> synthesize a SAFE default.
 *
 * Safety principle for synthesized defaults: never auto-"admit". Admitting is the
 * one move that can concede liability, so a backfilled paragraph is always a
 * denial-equivalent, marked low-confidence and flagged for attorney review.
 */

const SAFE_DEFAULT: Record<AllegationType, ResponseType> = {
  factual_plaintiff: "insufficient_knowledge",
  factual_defendant: "insufficient_knowledge", // conservative: never auto-admit
  jurisdictional: "no_response_required",
  legal_conclusion: "deny",
  incorporation: "no_response_required",
  damages: "deny",
};

function defaultText(label: string, type: ResponseType): string {
  switch (type) {
    case "deny":
      return `Defendant denies the allegations in Paragraph ${label}.`;
    case "insufficient_knowledge":
      return `Defendant lacks knowledge or information sufficient to form a belief as to the truth of the allegations in Paragraph ${label}, and therefore denies them.`;
    case "no_response_required":
      return `Paragraph ${label} states a legal conclusion to which no response is required; to the extent a response is required, Defendant denies the allegations.`;
    default:
      return `Defendant denies the allegations in Paragraph ${label}.`;
  }
}

export function reconcileResponses(
  complaint: Complaint,
  raw: AllegationResponse[],
): { responses: AllegationResponse[]; repairs: ValidationIssue[] } {
  const validLabels = new Set(complaint.allegations.map((a) => a.label));
  const repairs: ValidationIssue[] = [];
  const byLabel = new Map<string, AllegationResponse>();

  for (const r of raw) {
    if (!validLabels.has(r.allegationLabel)) {
      repairs.push({
        severity: "warning",
        code: "dropped_hallucinated",
        message: `Dropped a response to non-existent paragraph ${r.allegationLabel}.`,
        allegationLabel: r.allegationLabel,
      });
      continue;
    }
    if (byLabel.has(r.allegationLabel)) {
      repairs.push({
        severity: "warning",
        code: "dropped_duplicate",
        message: `Dropped a duplicate response for paragraph ${r.allegationLabel}.`,
        allegationLabel: r.allegationLabel,
      });
      continue;
    }
    byLabel.set(r.allegationLabel, r);
  }

  // Backfill any allegation the model failed to answer.
  for (const a of complaint.allegations) {
    if (byLabel.has(a.label)) continue;
    const type = SAFE_DEFAULT[a.type];
    byLabel.set(a.label, {
      allegationLabel: a.label,
      responseType: type,
      responseText: defaultText(a.label, type),
      rationale:
        "Auto-filled: the model did not return a response for this paragraph. A conservative denial-equivalent was inserted.",
      confidence: 0.3,
      flags: ["auto-filled — attorney review required"],
    });
    repairs.push({
      severity: "warning",
      code: "backfilled_missing",
      message: `Model omitted paragraph ${a.label}; inserted a conservative default — review recommended.`,
      allegationLabel: a.label,
    });
  }

  // Preserve complaint order.
  const responses = complaint.allegations.map((a) => byLabel.get(a.label)!);
  return { responses, repairs };
}
