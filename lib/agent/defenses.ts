import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "../llm/provider";
import { withRetry } from "../llm/call";
import { AffirmativeDefense, type Complaint } from "../schemas";

/**
 * Step 3: propose affirmative defenses inferred from the causes of action.
 *
 * Affirmative defenses must be pleaded in the Answer or they are waived
 * (FRCP 8(c)), so the value here is breadth-with-judgment: surface the defenses
 * a competent defense lawyer would plead for THIS complaint, each with a one-line
 * basis tying it to the facts, and explicitly avoid boilerplate that doesn't fit.
 */

const DefenseItem = z.object({
  name: z.string().describe("e.g. 'Comparative Negligence', 'Statute of Limitations'"),
  text: z
    .string()
    .describe("The pleaded defense language as it would appear in the Answer."),
  basis: z
    .string()
    .describe("One sentence on why this defense plausibly applies to this complaint."),
  relatedCauses: z.array(z.string()).optional(),
});

const DefensesResult = z.object({
  defenses: z.array(DefenseItem),
});

const SYSTEM = `You are a senior defense litigator drafting the affirmative defenses section of an Answer. Under FRCP 8(c) (and state analogues) affirmative defenses are waived if not pleaded, so you plead the defenses a careful lawyer would assert for THIS complaint — but you exercise judgment and do not pad with inapplicable boilerplate.

For a premises-liability / negligence complaint, strongly consider: failure to state a claim; comparative/contributory negligence; assumption of risk; the open-and-obvious doctrine; lack of notice of the alleged dangerous condition (actual or constructive); failure to mitigate damages; that the injury was caused by a third party or superseding cause; statute of limitations (analyze plausibility from the incident date vs. filing date); and reservation of the right to assert further defenses as discovery proceeds.

Order them sensibly. Keep each defense crisp and properly pleaded. The 'basis' is for the reviewing attorney and is not filed.`;

export async function proposeDefenses(
  complaint: Complaint,
): Promise<AffirmativeDefense[]> {
  const causes = complaint.causesOfAction.map((c) => c.name).join("; ");
  const factsSummary = complaint.allegations
    .filter((a) => a.type !== "legal_conclusion")
    .map((a) => `(${a.label}) ${a.text}`)
    .join("\n");

  const { object } = await withRetry(
    (abortSignal) =>
      generateObject({
        model: getModel(),
        schema: DefensesResult,
        system: SYSTEM,
        prompt: `Jurisdiction: ${complaint.caption.state ?? ""} (${complaint.caption.jurisdiction})
Causes of action: ${causes}
Defendant: ${complaint.caption.defendants.join(", ")}

Key factual allegations:
${factsSummary}

Propose the affirmative defenses to plead in the Answer. Tie each to this complaint; omit defenses that clearly do not apply.`,
        temperature: 0.2,
        abortSignal,
        maxRetries: 0, // withRetry is the single retry layer (avoid quota amplification)
      }),
    { label: "defenses" },
  );

  return object.defenses.map((d, i) =>
    AffirmativeDefense.parse({ ...d, number: i + 1 }),
  );
}
