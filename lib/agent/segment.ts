import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "../llm/provider";
import {
  Complaint,
  ComplaintCaption,
  AllegationType,
  CauseOfAction,
  type Provenance,
} from "../schemas";

/**
 * Optional Step 0 (for arbitrary uploads): turn raw complaint text into the
 * structured Complaint model. Shipped demo cases are pre-segmented and
 * human-verified (see data/complaints/*.json) so grounding is rock-solid; this
 * LLM path handles pasted/uploaded complaints where we don't have a verified
 * fixture.
 *
 * Engineering note: paragraph identity is the one thing we cannot let the model
 * be sloppy about, so the schema forces an integer `number` per allegation and
 * we re-validate sequence/uniqueness downstream. Everything genuinely fuzzy
 * (cleaning OCR, classifying paragraph type, finding causes of action) is where
 * the model earns its keep.
 */

/** Model output — note: no `ordinal`; we assign it deterministically by index. */
const SegmentedAllegation = z.object({
  label: z
    .string()
    .describe("The filed paragraph label exactly, e.g. '1', '1.1', '2.16'."),
  text: z.string(),
  section: z.string().optional(),
  type: AllegationType,
  incorporatesRefs: z.array(z.string()).optional(),
  ocrNoise: z.boolean().optional(),
});

const SegmentResult = z.object({
  caption: ComplaintCaption,
  allegations: z.array(SegmentedAllegation),
  causesOfAction: z.array(CauseOfAction),
  prayerForRelief: z.array(z.string()),
});

const SYSTEM = `You convert the raw OCR text of a civil complaint into structured data.

- Extract the caption: court, county, state, case number, judge (if present), plaintiffs, defendants, document title, and whether the court is 'federal' or 'state'.
- Split the body into its NUMBERED allegations. Preserve the filed paragraph numbers exactly — do not renumber. Drop page markers, headers, and line noise. Lightly clean obvious OCR errors without changing meaning.
- Classify each allegation's type: factual_plaintiff (facts about plaintiff/their conduct), factual_defendant (facts about defendant it can verify), jurisdictional, legal_conclusion (duty/breach/causation/negligence/liability or statute quotes), incorporation ("re-alleges paragraphs X-Y"), or damages.
- For incorporation paragraphs, list the referenced paragraph numbers in incorporatesRefs.
- Set ocrNoise=true on any allegation whose source text was clearly garbled.
- Extract the causes of action (counts) with the paragraph numbers they span, and the prayer-for-relief items.`;

export async function segmentComplaint(
  id: string,
  rawText: string,
  provenance: Provenance,
): Promise<Complaint> {
  const { object } = await generateObject({
    model: getModel(),
    schema: SegmentResult,
    system: SYSTEM,
    prompt: `Structure the following complaint text.\n\n---\n${rawText}\n---`,
    temperature: 0,
  });

  return Complaint.parse({
    id,
    caption: object.caption,
    allegations: object.allegations.map((a, i) => ({ ...a, ordinal: i + 1 })),
    causesOfAction: object.causesOfAction,
    prayerForRelief: object.prayerForRelief,
    provenance,
    rawText,
  });
}
