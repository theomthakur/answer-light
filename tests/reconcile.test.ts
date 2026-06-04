import { describe, it, expect } from "vitest";
import { reconcileResponses } from "../lib/agent/reconcile";
import { validateGrounding } from "../lib/agent/validate";
import { makeComplaint, resp } from "./_helpers";

describe("reconcileResponses (self-healing)", () => {
  const c = makeComplaint();

  it("returns exactly one grounded response per allegation, in order", () => {
    const { responses } = reconcileResponses(c, [resp("3", "deny"), resp("1", "admit"), resp("2", "deny")]);
    expect(responses.map((r) => r.allegationLabel)).toEqual(["1", "2", "3"]);
    expect(validateGrounding(c, responses).filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("drops hallucinated paragraph responses", () => {
    const { responses, repairs } = reconcileResponses(c, [
      resp("1", "admit"),
      resp("2", "deny"),
      resp("3", "deny"),
      resp("99", "deny"),
    ]);
    expect(responses.find((r) => r.allegationLabel === "99")).toBeUndefined();
    expect(repairs.some((r) => r.code === "dropped_hallucinated")).toBe(true);
  });

  it("dedupes, keeping the first response", () => {
    const { responses, repairs } = reconcileResponses(c, [
      resp("1", "admit"),
      resp("1", "deny"),
      resp("2", "deny"),
      resp("3", "deny"),
    ]);
    expect(responses.filter((r) => r.allegationLabel === "1")).toHaveLength(1);
    expect(responses.find((r) => r.allegationLabel === "1")!.responseType).toBe("admit");
    expect(repairs.some((r) => r.code === "dropped_duplicate")).toBe(true);
  });

  it("backfills a missing paragraph with a safe default and flags it", () => {
    const { responses, repairs } = reconcileResponses(c, [resp("1", "admit"), resp("2", "deny")]);
    const p3 = responses.find((r) => r.allegationLabel === "3")!;
    expect(p3).toBeDefined();
    expect(p3.flags).toContain("auto-filled — attorney review required");
    expect(repairs.some((r) => r.code === "backfilled_missing")).toBe(true);
  });

  it("NEVER auto-admits a backfilled paragraph (no accidental concession)", () => {
    // Drop every response; reconcile must fill all of them without 'admit'.
    const { responses } = reconcileResponses(c, []);
    expect(responses).toHaveLength(3);
    expect(responses.every((r) => r.responseType !== "admit")).toBe(true);
  });

  it("uses denial for legal conclusions and insufficient-knowledge for plaintiff facts", () => {
    const { responses } = reconcileResponses(c, []);
    const byLabel = Object.fromEntries(responses.map((r) => [r.allegationLabel, r.responseType]));
    expect(byLabel["3"]).toBe("deny"); // legal_conclusion
    expect(byLabel["2"]).toBe("insufficient_knowledge"); // factual_plaintiff
  });
});
