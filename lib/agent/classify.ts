import { generateObject } from "ai";
import { z } from "zod";
import { getModel, modelId } from "../llm/provider";
import { withRetry } from "../llm/call";
import { AllegationResponse, ResponseType, type Complaint } from "../schemas";

/**
 * Step 2 of the pipeline: for each numbered allegation, decide the defendant's
 * response. This is where the real legal judgment lives, so the prompt encodes
 * the actual FRCP 8(b) heuristics a defense paralegal applies:
 *
 *  - Admit only what is independently verifiable and safe (the defendant's own
 *    corporate identity, the existence/location of the store).
 *  - Use "insufficient knowledge" (FRCP 8(b)(5)) for facts solely within the
 *    plaintiff's knowledge (what she was doing, how she fell, her injuries,
 *    her medical treatment) — this has the legal effect of a denial.
 *  - Deny legal conclusions (duty, breach, causation, negligence, liability),
 *    which are the heart of the case and must never be admitted.
 *  - "partial" for compound allegations: admit the safe fact, deny/insufficient
 *    the rest, and say which is which.
 *
 * We classify all allegations in a single structured call and then validate
 * grounding deterministically in lib/agent/validate.ts.
 */

const ClassificationItem = z.object({
  allegationLabel: z
    .string()
    .describe(
      "The paragraph label being responded to (e.g. '2' or '2.16'). Must match the input label exactly.",
    ),
  responseType: ResponseType,
  responseText: z
    .string()
    .describe(
      "The exact answer language to file, e.g. 'Defendant admits the allegations in Paragraph 2.' or 'Defendant lacks knowledge or information sufficient to form a belief as to the truth of the allegations in Paragraph 7, and therefore denies them.'",
    ),
  rationale: z
    .string()
    .describe("One sentence on WHY, for the reviewing attorney. Not filed."),
  confidence: z.number().min(0).max(1),
  flags: z
    .array(z.string())
    .optional()
    .describe(
      "Short reviewer flags, e.g. 'compound allegation', 'OCR-garbled source', 'legal conclusion'.",
    ),
});

const ClassificationResult = z.object({
  responses: z.array(ClassificationItem),
});

const SYSTEM = `You are a senior litigation paralegal drafting a defendant's Answer to a civil complaint. You apply Federal Rule of Civil Procedure 8(b) (and its state analogues) faithfully.

Rules you follow exactly:
- ADMIT only allegations that are objectively true and safe for the defendant to concede: the defendant's own corporate identity/existence, the existence and location of its premises, and uncontested background facts. When in doubt, do NOT admit.
- For factual allegations about the PLAINTIFF that are solely within the plaintiff's knowledge (what she was doing, how an incident occurred, her injuries, her medical diagnosis and treatment, how her life was affected), respond with INSUFFICIENT_KNOWLEDGE. Under Rule 8(b)(5) this has the effect of a denial. Do not admit these and do not flatly deny facts you cannot know.
- DENY legal conclusions and any allegation asserting the defendant's duty, breach, negligence, causation, or liability. These are the contested core of the case.
- Recitations or quotations of statutes / jury instructions (e.g. "UJI 13-1604 states...") are NO_RESPONSE_REQUIRED: respond that the paragraph states a legal conclusion or quotes authority that speaks for itself, to which no response is required, and deny any characterization to the extent a response is required.
- Use PARTIAL for compound allegations that mix a safe admittable fact with a contested fact or legal conclusion; explain in responseText what is admitted and what is denied.
- Allegations of jurisdiction/venue: if plainly proper, you may treat as a legal conclusion requiring no response (or admit jurisdiction/venue only).
- Never invent facts. Never concede liability, causation, or damages.

Write responseText in the conventional third person ("Defendant admits...", "Defendant denies...", "Defendant lacks knowledge or information sufficient to form a belief as to the truth of the allegations in Paragraph N, and therefore denies them."). Reference the paragraph number in the text.`;

export async function classifyAllegations(
  complaint: Complaint,
): Promise<AllegationResponse[]> {
  const allegationsForPrompt = complaint.allegations.map((a) => ({
    paragraph: a.label,
    section: a.section,
    type: a.type,
    text: a.text,
    ocrNoise: a.ocrNoise ?? false,
  }));

  const { object } = await withRetry(
    (abortSignal) =>
      generateObject({
        model: getModel(),
        schema: ClassificationResult,
        system: SYSTEM,
        prompt: `Complaint: ${complaint.caption.documentTitle}
Court: ${complaint.caption.court} (${complaint.caption.state ?? ""}) — ${complaint.caption.jurisdiction} jurisdiction
Defendant filing this Answer: ${complaint.caption.defendants.join(", ")}

Produce exactly one response for EACH of the following ${allegationsForPrompt.length} numbered allegations. Do not skip any, do not add any. If the source text shows OCR noise, respond to the evident meaning and add an 'OCR-garbled source' flag.

ALLEGATIONS (JSON):
${JSON.stringify(allegationsForPrompt, null, 2)}`,
        temperature: 0,
        abortSignal,
        maxRetries: 0, // withRetry is the single retry layer (avoid quota amplification)
      }),
    { label: "classify" },
  );

  // Coerce to our domain type (schema is structurally identical).
  return object.responses.map((r) => AllegationResponse.parse(r));
}

export { modelId };
