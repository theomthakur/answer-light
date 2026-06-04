import { describe, it, expect } from "vitest";
import { computeDeadline } from "../lib/agent/deadlines";
import { makeComplaint } from "./_helpers";

const caption = (over: Record<string, unknown>) =>
  makeComplaint().caption && { ...makeComplaint().caption, ...over };

describe("computeDeadline", () => {
  it("federal -> 21 days, FRCP 12(a)", () => {
    const d = computeDeadline(caption({ jurisdiction: "federal", state: "Alaska" }));
    expect(d.daysToRespond).toBe(21);
    expect(d.jurisdiction).toBe("federal");
    expect(d.rule).toMatch(/FRCP 12/);
  });

  it("New Mexico -> 30 days", () => {
    const d = computeDeadline(caption({ jurisdiction: "state", state: "New Mexico" }));
    expect(d.daysToRespond).toBe(30);
    expect(d.rule).toMatch(/NMRA/);
  });

  it("Washington -> 20 days", () => {
    const d = computeDeadline(caption({ jurisdiction: "state", state: "Washington" }));
    expect(d.daysToRespond).toBe(20);
  });

  it("is case-insensitive on the state name", () => {
    const d = computeDeadline(caption({ jurisdiction: "state", state: "  new MEXICO " }));
    expect(d.daysToRespond).toBe(30);
  });

  it("unknown state -> conservative default flagged for verification", () => {
    const d = computeDeadline(caption({ jurisdiction: "state", state: "Atlantis" }));
    expect(d.daysToRespond).toBe(20);
    expect(d.rule).toMatch(/VERIFY/i);
    expect(d.note).toMatch(/VERIFY/i);
  });
});
