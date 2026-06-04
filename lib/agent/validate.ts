import type {
  Complaint,
  AllegationResponse,
  ValidationIssue,
} from "../schemas";

/**
 * Deterministic guardrails on the model's output. The grounding contract is:
 *   1. Every allegation in the complaint has exactly one response (completeness).
 *   2. Every response points to an allegation that actually exists (no hallucination).
 *   3. No allegation gets two responses (no duplicates).
 *
 * These are checked in code, not by the model, because in a legal filing a
 * dropped or invented paragraph is a substantive defect, not a style nit. The
 * same checks power the eval harness's grounding metrics.
 */
export function validateGrounding(
  complaint: Complaint,
  responses: AllegationResponse[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const complaintLabels = new Set(complaint.allegations.map((a) => a.label));
  const seen = new Map<string, number>(); // label -> count

  for (const r of responses) {
    seen.set(r.allegationLabel, (seen.get(r.allegationLabel) ?? 0) + 1);

    // 2. Hallucinated grounding pointer.
    if (!complaintLabels.has(r.allegationLabel)) {
      issues.push({
        severity: "error",
        code: "grounding_hallucinated",
        message: `Response references paragraph ${r.allegationLabel}, which does not exist in the complaint.`,
        allegationLabel: r.allegationLabel,
      });
    }
  }

  // 1. Completeness — any unanswered allegation.
  for (const a of complaint.allegations) {
    if (!seen.has(a.label)) {
      issues.push({
        severity: "error",
        code: "grounding_missing",
        message: `No response generated for paragraph ${a.label}.`,
        allegationLabel: a.label,
      });
    }
  }

  // 3. Duplicate responses.
  for (const [label, count] of Array.from(seen.entries())) {
    if (count > 1) {
      issues.push({
        severity: "error",
        code: "grounding_duplicate",
        message: `Paragraph ${label} received ${count} responses; expected exactly one.`,
        allegationLabel: label,
      });
    }
  }

  // Soft signal: low-confidence responses worth a human look.
  for (const r of responses) {
    if (r.confidence < 0.5) {
      issues.push({
        severity: "warning",
        code: "low_confidence",
        message: `Low-confidence response for paragraph ${r.allegationLabel} (${r.confidence.toFixed(
          2,
        )}). Recommend attorney review.`,
        allegationLabel: r.allegationLabel,
      });
    }
  }

  return issues;
}

/**
 * Stable ordering by the complaint's filing order. We sort responses using the
 * label->ordinal map from the complaint (not the model), so ordering is correct
 * regardless of label format ("2" vs "2.16" vs "FIRST").
 */
export function sortByAllegation(
  complaint: Complaint,
  responses: AllegationResponse[],
): AllegationResponse[] {
  const ordinalOf = new Map(complaint.allegations.map((a) => [a.label, a.ordinal]));
  return [...responses].sort(
    (a, b) =>
      (ordinalOf.get(a.allegationLabel) ?? 1e9) -
      (ordinalOf.get(b.allegationLabel) ?? 1e9),
  );
}
