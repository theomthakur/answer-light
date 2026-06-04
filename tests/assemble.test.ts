import { describe, it, expect } from "vitest";
import { renderAnswer, defendantPrayer } from "../lib/agent/assemble";
import { computeDeadline } from "../lib/agent/deadlines";
import { makeComplaint, resp } from "./_helpers";
import type { AnswerDocument } from "../lib/schemas";

function answer(): AnswerDocument {
  const c = makeComplaint();
  return {
    complaintId: c.id,
    caption: c.caption,
    responses: [resp("1", "admit"), resp("2", "insufficient_knowledge"), resp("3", "deny")],
    affirmativeDefenses: [
      { number: 1, name: "Comparative Negligence", text: "Plaintiff was at fault.", basis: "slip-and-fall" },
    ],
    prayer: defendantPrayer(),
    deadline: computeDeadline(c.caption),
    generatedAt: "2026-01-01T00:00:00.000Z",
    model: "test",
  };
}

describe("renderAnswer", () => {
  const out = renderAnswer(answer());

  it("includes the caption and an Answer title", () => {
    expect(out).toContain("TEST DISTRICT COURT");
    expect(out).toMatch(/DEFENDANT'S ANSWER TO/);
    expect(out).toContain("Case No. T-1");
  });

  it("renders one numbered response per allegation label", () => {
    expect(out).toMatch(/^1\. Response to 1\./m);
    expect(out).toMatch(/^2\. Response to 2\./m);
    expect(out).toMatch(/^3\. Response to 3\./m);
  });

  it("includes affirmative defenses and a prayer", () => {
    expect(out).toContain("AFFIRMATIVE DEFENSES");
    expect(out).toContain("Comparative Negligence");
    expect(out).toContain("PRAYER FOR RELIEF");
  });

  it("is deterministic (stable output for the same input)", () => {
    expect(renderAnswer(answer())).toBe(out);
  });
});
