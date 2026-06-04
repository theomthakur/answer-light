import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { listComplaints, getComplaint } from "../lib/complaints";
import { Complaint, ResponseType } from "../lib/schemas";

const complaints = listComplaints();

describe("shipped complaint fixtures", () => {
  it("loads at least the three sample cases", () => {
    expect(complaints.length).toBeGreaterThanOrEqual(3);
  });

  for (const c of complaints) {
    describe(c.id, () => {
      it("conforms to the Complaint schema", () => {
        expect(Complaint.safeParse(c).success).toBe(true);
      });

      it("has unique paragraph labels", () => {
        const labels = c.allegations.map((a) => a.label);
        expect(new Set(labels).size).toBe(labels.length);
      });

      it("has unique, gap-free ordinals starting at 1", () => {
        const ordinals = c.allegations.map((a) => a.ordinal).sort((x, y) => x - y);
        expect(ordinals).toEqual(c.allegations.map((_, i) => i + 1));
      });

      it("causes of action reference real paragraph labels", () => {
        const labels = new Set(c.allegations.map((a) => a.label));
        for (const cause of c.causesOfAction) {
          for (const p of cause.paragraphs) expect(labels.has(p)).toBe(true);
        }
      });

      it("incorporation references point to real paragraphs", () => {
        const labels = new Set(c.allegations.map((a) => a.label));
        for (const a of c.allegations) {
          for (const ref of a.incorporatesRefs ?? []) expect(labels.has(ref)).toBe(true);
        }
      });
    });
  }
});

describe("gold eval labels", () => {
  const goldDir = path.join(process.cwd(), "evals", "gold");
  const goldFiles = fs.readdirSync(goldDir).filter((f) => f.endsWith(".json"));
  const responseTypes = ResponseType.options as readonly string[];

  for (const file of goldFiles) {
    const gold = JSON.parse(fs.readFileSync(path.join(goldDir, file), "utf8"));
    describe(file, () => {
      it("references a complaint that exists", () => {
        expect(getComplaint(gold.complaintId)).not.toBeNull();
      });

      it("labels exactly cover the complaint's allegations", () => {
        const c = getComplaint(gold.complaintId)!;
        const goldLabels = new Set(gold.labels.map((l: { label: string }) => l.label));
        const allegationLabels = new Set(c.allegations.map((a) => a.label));
        expect(goldLabels).toEqual(allegationLabels);
      });

      it("every expected/acceptable value is a valid ResponseType", () => {
        for (const l of gold.labels) {
          expect(responseTypes).toContain(l.expected);
          expect(l.acceptable).toContain(l.expected);
          for (const a of l.acceptable) expect(responseTypes).toContain(a);
        }
      });
    });
  }
});
