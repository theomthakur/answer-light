import type { AnswerDocument } from "../schemas";

/**
 * Step 4: render the structured AnswerDocument into a filing-formatted plain-text
 * Answer. Deterministic on purpose — once the model has made the per-paragraph
 * decisions, turning them into a document is templating, not judgment, and we
 * want byte-stable output for export/diffing.
 */
export function renderAnswer(answer: AnswerDocument): string {
  const c = answer.caption;
  const lines: string[] = [];

  // --- Caption -----------------------------------------------------------
  lines.push(c.court.toUpperCase());
  if (c.county) lines.push(`COUNTY OF ${c.county.toUpperCase()}`);
  if (c.state) lines.push(`STATE OF ${c.state.toUpperCase()}`);
  lines.push("");
  lines.push(`${c.plaintiffs.join(", ").toUpperCase()},`);
  lines.push("                              Plaintiff,");
  lines.push("");
  lines.push(`v.                                          Case No. ${c.caseNumber}`);
  lines.push("");
  lines.push(`${c.defendants.join(", ").toUpperCase()},`);
  lines.push("                              Defendant.");
  lines.push("");
  lines.push(
    `DEFENDANT'S ANSWER TO ${c.documentTitle.toUpperCase()}`,
  );
  lines.push("");
  lines.push(
    `Defendant ${c.defendants.join(", ")}, by and through undersigned counsel, answers Plaintiff's ${c.documentTitle} as follows:`,
  );
  lines.push("");

  // --- Responses to allegations -----------------------------------------
  lines.push("RESPONSES TO ALLEGATIONS");
  lines.push("");
  for (const r of answer.responses) {
    lines.push(`${r.allegationLabel}. ${r.responseText}`);
    lines.push("");
  }

  // --- Affirmative defenses ---------------------------------------------
  if (answer.affirmativeDefenses.length) {
    lines.push("AFFIRMATIVE DEFENSES");
    lines.push("");
    answer.affirmativeDefenses.forEach((d) => {
      const ord = ordinal(d.number).toUpperCase();
      lines.push(`${ord} AFFIRMATIVE DEFENSE — ${d.name}`);
      lines.push(d.text);
      lines.push("");
    });
  }

  // --- Prayer ------------------------------------------------------------
  lines.push("PRAYER FOR RELIEF");
  lines.push("");
  lines.push("WHEREFORE, Defendant respectfully requests that this Court:");
  answer.prayer.forEach((p, i) => {
    lines.push(`  ${String.fromCharCode(97 + i)}. ${p};`);
  });
  lines.push("");
  lines.push("Respectfully submitted,");
  lines.push("");
  lines.push("_________________________");
  lines.push("Counsel for Defendant");

  return lines.join("\n");
}

/** Defendant's standard prayer for relief. */
export function defendantPrayer(): string[] {
  return [
    "Dismiss Plaintiff's Complaint in its entirety, with prejudice",
    "Enter judgment in favor of Defendant and against Plaintiff",
    "Award Defendant its costs and attorneys' fees incurred in defending this action",
    "Grant such other and further relief as the Court deems just and proper",
  ];
}

function ordinal(n: number): string {
  const names = [
    "First",
    "Second",
    "Third",
    "Fourth",
    "Fifth",
    "Sixth",
    "Seventh",
    "Eighth",
    "Ninth",
    "Tenth",
    "Eleventh",
    "Twelfth",
    "Thirteenth",
    "Fourteenth",
    "Fifteenth",
  ];
  return names[n - 1] ?? `${n}th`;
}
