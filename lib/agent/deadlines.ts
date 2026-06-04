import type { ComplaintCaption, DeadlineInfo } from "../schemas";

/**
 * Response-deadline rules. Deliberately deterministic, NOT model-generated:
 * a missed answer deadline is a default judgment, so this is exactly the kind
 * of high-stakes fact we never want a language model to "estimate."
 *
 * Federal: FRCP 12(a)(1)(A)(i) -> 21 days after service of summons & complaint.
 * State rules vary; we encode the ones our shipped cases need and fall back to
 * a conservative default with an explicit "verify" note for anything unknown.
 */

type StateRule = { rule: string; days: number; note: string };

const STATE_RULES: Record<string, StateRule> = {
  "new mexico": {
    rule: "NMRA 1-012(A)",
    days: 30,
    note: "New Mexico Rule 1-012(A) NMRA: answer due within 30 days after service of process.",
  },
  california: {
    rule: "Cal. Code Civ. Proc. Section 412.20(a)(3)",
    days: 30,
    note: "California: 30 days after service of summons to file a responsive pleading.",
  },
  "new york": {
    rule: "CPLR 3012(a) / 320(a)",
    days: 20,
    note: "New York: generally 20 days after personal service (30 if served other than by personal delivery).",
  },
  texas: {
    rule: "Tex. R. Civ. P. 99(b)",
    days: 20,
    note: "Texas: answer due by 10:00 a.m. on the Monday after 20 days from service.",
  },
  washington: {
    rule: "Wash. Super. Ct. Civ. R. 12(a)",
    days: 20,
    note: "Washington CR 12(a): 20 days after service of summons (60 days if served outside the state or by publication). Note: claims against the State have their own pre-suit tort-claim requirements.",
  },
};

const FEDERAL_RULE: StateRule = {
  rule: "FRCP 12(a)(1)(A)(i)",
  days: 21,
  note: "Federal Rule of Civil Procedure 12(a)(1)(A)(i): 21 days after service of the summons and complaint.",
};

export function computeDeadline(caption: ComplaintCaption): DeadlineInfo {
  if (caption.jurisdiction === "federal") {
    return {
      rule: FEDERAL_RULE.rule,
      daysToRespond: FEDERAL_RULE.days,
      jurisdiction: "federal",
      note: FEDERAL_RULE.note,
    };
  }

  const key = (caption.state ?? "").trim().toLowerCase();
  const match = STATE_RULES[key];
  if (match) {
    return {
      rule: match.rule,
      daysToRespond: match.days,
      jurisdiction: "state",
      note: match.note,
    };
  }

  // Unknown state -> conservative default, flagged for human verification.
  return {
    rule: "State rule — VERIFY",
    daysToRespond: 20,
    jurisdiction: "state",
    note: `No encoded rule for "${caption.state ?? "unknown"}". Defaulting to a conservative 20 days — VERIFY the applicable state deadline before relying on this.`,
  };
}
