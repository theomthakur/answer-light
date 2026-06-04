import { describe, it, expect } from "vitest";
import { validateGrounding, sortByAllegation } from "../lib/agent/validate";
import { makeComplaint, resp } from "./_helpers";

describe("validateGrounding", () => {
  const c = makeComplaint();

  it("passes a complete, grounded set with no issues", () => {
    const issues = validateGrounding(c, [
      resp("1", "admit"),
      resp("2", "insufficient_knowledge"),
      resp("3", "deny"),
    ]);
    expect(issues).toHaveLength(0);
  });

  it("flags a missing response (completeness)", () => {
    const issues = validateGrounding(c, [resp("1", "admit"), resp("2", "deny")]);
    expect(issues.some((i) => i.code === "grounding_missing" && i.allegationLabel === "3")).toBe(true);
  });

  it("flags a hallucinated paragraph reference", () => {
    const issues = validateGrounding(c, [
      resp("1", "admit"),
      resp("2", "deny"),
      resp("3", "deny"),
      resp("99", "deny"),
    ]);
    expect(issues.some((i) => i.code === "grounding_hallucinated" && i.allegationLabel === "99")).toBe(true);
  });

  it("flags duplicate responses for the same paragraph", () => {
    const issues = validateGrounding(c, [
      resp("1", "admit"),
      resp("1", "deny"),
      resp("2", "deny"),
      resp("3", "deny"),
    ]);
    expect(issues.some((i) => i.code === "grounding_duplicate" && i.allegationLabel === "1")).toBe(true);
  });

  it("warns on low-confidence responses", () => {
    const issues = validateGrounding(c, [
      resp("1", "admit", 0.2),
      resp("2", "deny"),
      resp("3", "deny"),
    ]);
    expect(issues.some((i) => i.code === "low_confidence" && i.severity === "warning")).toBe(true);
  });
});

describe("sortByAllegation", () => {
  it("orders by the complaint's filing order, not string order", () => {
    const c = makeComplaint({
      allegations: [
        { label: "2", ordinal: 1, type: "factual_plaintiff", text: "a" },
        { label: "10", ordinal: 2, type: "factual_plaintiff", text: "b" },
        { label: "2.5", ordinal: 3, type: "factual_plaintiff", text: "c" },
      ],
    });
    const sorted = sortByAllegation(c, [resp("2.5", "deny"), resp("10", "deny"), resp("2", "deny")]);
    expect(sorted.map((r) => r.allegationLabel)).toEqual(["2", "10", "2.5"]);
  });
});
