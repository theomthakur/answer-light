import { z } from "zod";

/**
 * Data model for the Complaint -> Answer workflow.
 *
 * Design notes:
 * - Paragraph `number` is the *source of truth for grounding*. Every response
 *   in an Answer must point back to an allegation number that actually exists
 *   in the complaint. We validate this deterministically (see lib/agent/validate.ts)
 *   rather than trusting the model, because a hallucinated or dropped paragraph
 *   in a legal filing is not a cosmetic bug.
 * - We separate `responseText` (what gets filed) from `rationale` (why the agent
 *   chose it). The rationale is for the paralegal/attorney reviewing the draft;
 *   it never goes in the document.
 */

// ---------------------------------------------------------------------------
// Complaint side
// ---------------------------------------------------------------------------

export const Jurisdiction = z.enum(["federal", "state"]);
export type Jurisdiction = z.infer<typeof Jurisdiction>;

/**
 * How a single numbered allegation should be treated. This drives the default
 * response strategy and is the main place legal judgment lives.
 */
export const AllegationType = z.enum([
  "factual_plaintiff", // facts about the plaintiff / their conduct the defendant can't verify
  "factual_defendant", // facts about the defendant the defendant CAN verify (identity, corporate status)
  "jurisdictional", // allegations supporting jurisdiction/venue
  "legal_conclusion", // statements of law or legal conclusions (duty, breach, causation, negligence)
  "incorporation", // "Plaintiff re-alleges paragraphs 1-20 as if fully set forth herein"
  "damages", // allegations describing the damages sought
]);
export type AllegationType = z.infer<typeof AllegationType>;

export const Allegation = z.object({
  /**
   * The paragraph label exactly as filed — the grounding key. A STRING, not a
   * number, because real complaints number paragraphs inconsistently: "1",
   * "1.1", "2.16", sometimes "FIRST". Everything that grounds back to a
   * paragraph references this label.
   */
  label: z.string(),
  /** Filing order, used only for stable sorting/completeness ordering. */
  ordinal: z.number().int().positive(),
  text: z.string(),
  section: z.string().optional(), // e.g. "JURISDICTION", "BACKGROUND", "DAMAGES"
  type: AllegationType,
  /** Paragraph labels this allegation incorporates by reference, if any. */
  incorporatesRefs: z.array(z.string()).optional(),
  /** True if the source text is garbled/ambiguous (OCR noise, broken numbering). */
  ocrNoise: z.boolean().optional(),
});
export type Allegation = z.infer<typeof Allegation>;

export const CauseOfAction = z.object({
  name: z.string(), // e.g. "Negligence (Premises Liability)"
  paragraphs: z.array(z.string()),
});
export type CauseOfAction = z.infer<typeof CauseOfAction>;

export const ComplaintCaption = z.object({
  court: z.string(),
  county: z.string().optional(),
  state: z.string().optional(),
  caseNumber: z.string(),
  judge: z.string().optional(),
  plaintiffs: z.array(z.string()),
  defendants: z.array(z.string()),
  documentTitle: z.string(),
  jurisdiction: Jurisdiction,
});
export type ComplaintCaption = z.infer<typeof ComplaintCaption>;

/** Provenance — proves this is real public-record data, not synthetic. */
export const Provenance = z.object({
  source: z.string(), // e.g. "DocumentCloud (public)"
  sourceUrl: z.string().url().optional(),
  retrievedAt: z.string(), // ISO date
  note: z.string().optional(),
});
export type Provenance = z.infer<typeof Provenance>;

export const Complaint = z.object({
  id: z.string(),
  caption: ComplaintCaption,
  allegations: z.array(Allegation),
  causesOfAction: z.array(CauseOfAction),
  prayerForRelief: z.array(z.string()),
  provenance: Provenance,
  /** The original (lightly cleaned) text, kept for audit / re-segmentation. */
  rawText: z.string().optional(),
});
export type Complaint = z.infer<typeof Complaint>;

// ---------------------------------------------------------------------------
// Answer side
// ---------------------------------------------------------------------------

/**
 * The four real options a defendant has when responding to an allegation, plus
 * a fifth for paragraphs that are pure legal conclusions (which by convention
 * "require no response" but are denied to the extent a response is deemed
 * required). FRCP 8(b).
 */
export const ResponseType = z.enum([
  "admit",
  "deny",
  "partial", // admit part, deny the rest (compound allegations)
  "insufficient_knowledge", // FRCP 8(b)(5): lacks knowledge sufficient to admit or deny -> has effect of denial
  "no_response_required", // legal conclusion; denied to the extent a response is required
]);
export type ResponseType = z.infer<typeof ResponseType>;

export const AllegationResponse = z.object({
  /** Grounding pointer — MUST match an allegation.label in the complaint. */
  allegationLabel: z.string(),
  responseType: ResponseType,
  /** The exact language that goes into the filed Answer. */
  responseText: z.string(),
  /** Why the agent chose this — shown to the reviewer, never filed. */
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  /** Reviewer-facing flags, e.g. "compound allegation", "OCR-garbled source". */
  flags: z.array(z.string()).optional(),
});
export type AllegationResponse = z.infer<typeof AllegationResponse>;

export const AffirmativeDefense = z.object({
  number: z.number().int().positive(),
  name: z.string(), // e.g. "Comparative Negligence"
  text: z.string(), // the pleaded defense language
  basis: z.string(), // why it plausibly applies to THIS complaint
  relatedCauses: z.array(z.string()).optional(),
});
export type AffirmativeDefense = z.infer<typeof AffirmativeDefense>;

export const DeadlineInfo = z.object({
  rule: z.string(), // e.g. "NMRA 1-012(A)" or "FRCP 12(a)(1)(A)(i)"
  daysToRespond: z.number().int().positive(),
  jurisdiction: Jurisdiction,
  note: z.string(),
});
export type DeadlineInfo = z.infer<typeof DeadlineInfo>;

export const AnswerDocument = z.object({
  complaintId: z.string(),
  caption: ComplaintCaption,
  responses: z.array(AllegationResponse),
  affirmativeDefenses: z.array(AffirmativeDefense),
  /** Defendant's prayer — typically dismissal with prejudice + costs. */
  prayer: z.array(z.string()),
  deadline: DeadlineInfo,
  generatedAt: z.string(),
  model: z.string(),
});
export type AnswerDocument = z.infer<typeof AnswerDocument>;

// ---------------------------------------------------------------------------
// Pipeline diagnostics — surfaced in the UI so the work is auditable, not magic.
// ---------------------------------------------------------------------------

export const ValidationIssue = z.object({
  severity: z.enum(["error", "warning"]),
  code: z.string(),
  message: z.string(),
  allegationLabel: z.string().optional(),
});
export type ValidationIssue = z.infer<typeof ValidationIssue>;

export const GenerationResult = z.object({
  answer: AnswerDocument,
  issues: z.array(ValidationIssue),
  timings: z.record(z.string(), z.number()), // step -> ms
});
export type GenerationResult = z.infer<typeof GenerationResult>;
