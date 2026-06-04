import type { Complaint, AllegationResponse, ResponseType } from "../lib/schemas";

/** Minimal valid complaint for unit tests, with override hooks. */
export function makeComplaint(over: Partial<Complaint> = {}): Complaint {
  return {
    id: "test",
    caption: {
      court: "Test District Court",
      county: "Test",
      state: "New Mexico",
      caseNumber: "T-1",
      plaintiffs: ["Pat Plaintiff"],
      defendants: ["Dan Defendant"],
      documentTitle: "Test Complaint",
      jurisdiction: "state",
    },
    provenance: { source: "test", retrievedAt: "2026-01-01" },
    causesOfAction: [{ name: "Negligence", paragraphs: ["3"] }],
    prayerForRelief: ["Damages"],
    allegations: [
      { label: "1", ordinal: 1, type: "factual_defendant", text: "Defendant is a company." },
      { label: "2", ordinal: 2, type: "factual_plaintiff", text: "Plaintiff slipped." },
      { label: "3", ordinal: 3, type: "legal_conclusion", text: "Defendant was negligent." },
    ],
    ...over,
  };
}

export function resp(
  allegationLabel: string,
  responseType: ResponseType,
  confidence = 0.9,
): AllegationResponse {
  return {
    allegationLabel,
    responseType,
    responseText: `Response to ${allegationLabel}.`,
    rationale: "because",
    confidence,
  };
}
