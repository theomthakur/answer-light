/**
 * Eval harness for the Complaint -> Answer agent.
 *
 *   npm run eval
 *
 * Measures the things that actually matter for a filed Answer:
 *   1. Classification accuracy  — does each response match the hand-labeled
 *      acceptable set for that paragraph? (the legal-judgment quality)
 *   2. Grounding validity       — does every response point to a real paragraph?
 *   3. Completeness             — is every allegation answered exactly once?
 *   4. Hallucination rate       — responses to paragraphs that don't exist.
 *
 * Grounding/completeness/hallucination reuse the SAME deterministic checks the
 * production pipeline runs (lib/agent/validate.ts), so the eval grades the real
 * system, not a parallel reimplementation.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // Next.js convention
dotenv.config(); // also pick up .env if present
import fs from "node:fs";
import path from "node:path";
import { getComplaint } from "../lib/complaints";
import { generateAnswer } from "../lib/agent/pipeline";
import { hasCredentials, modelId, normalizeEnv } from "../lib/llm/provider";
import type { ResponseType } from "../lib/schemas";

type GoldLabel = {
  label: string;
  expected: ResponseType;
  acceptable: ResponseType[];
  why: string;
};
type Gold = { complaintId: string; labels: GoldLabel[] };

const RUNS = Number(process.env.EVAL_RUNS ?? 1);

async function main() {
  normalizeEnv();
  if (!hasCredentials()) {
    console.error(
      "\n  No API key found. Set GEMINI_API_KEY (free: https://aistudio.google.com/apikey) in .env.local\n",
    );
    process.exit(1);
  }

  const goldDir = path.join(process.cwd(), "evals", "gold");
  const goldFiles = fs.readdirSync(goldDir).filter((f) => f.endsWith(".json"));

  console.log(`\n  Complaint → Answer · Eval Harness`);
  console.log(`  model: ${modelId()}   runs/case: ${RUNS}\n`);

  let totalCorrect = 0;
  let totalLabeled = 0;
  let totalGroundingErrors = 0;
  let allPassed = true;

  for (const file of goldFiles) {
    const gold: Gold = JSON.parse(fs.readFileSync(path.join(goldDir, file), "utf8"));
    const complaint = getComplaint(gold.complaintId);
    if (!complaint) {
      console.log(`  ! skipping ${gold.complaintId}: fixture not found`);
      continue;
    }

    const labelByKey = new Map(gold.labels.map((l) => [l.label, l]));
    let caseCorrect = 0;
    let caseLabeled = 0;
    let caseGroundingErrors = 0;
    const misses: string[] = [];

    for (let run = 0; run < RUNS; run++) {
      const { answer, issues } = await generateAnswer(complaint);

      const groundingErrors = issues.filter((i) => i.severity === "error");
      caseGroundingErrors += groundingErrors.length;

      for (const r of answer.responses) {
        const gl = labelByKey.get(r.allegationLabel);
        if (!gl) continue; // hallucinated paragraph — caught by grounding check
        caseLabeled++;
        if (gl.acceptable.includes(r.responseType)) {
          caseCorrect++;
        } else if (run === 0) {
          misses.push(
            `      ¶${gl.label}: got ${r.responseType}, expected one of [${gl.acceptable.join(", ")}] — ${gl.why}`,
          );
        }
      }
    }

    const acc = caseLabeled ? (caseCorrect / caseLabeled) * 100 : 0;
    const groundingClean = caseGroundingErrors === 0;
    const pass = acc >= 85 && groundingClean;
    allPassed &&= pass;

    console.log(`  ${pass ? "PASS" : "FAIL"}  ${complaint.caption.documentTitle}`);
    console.log(`        classification accuracy : ${acc.toFixed(1)}%  (${caseCorrect}/${caseLabeled})`);
    console.log(`        grounding errors        : ${caseGroundingErrors} ${groundingClean ? "(clean)" : ""}`);
    if (misses.length) {
      console.log(`        disagreements (run 1):`);
      misses.forEach((m) => console.log(m));
    }
    console.log("");

    totalCorrect += caseCorrect;
    totalLabeled += caseLabeled;
    totalGroundingErrors += caseGroundingErrors;
  }

  const overall = totalLabeled ? (totalCorrect / totalLabeled) * 100 : 0;
  console.log("  ──────────────────────────────────────────────");
  console.log(`  OVERALL  classification: ${overall.toFixed(1)}%   grounding errors: ${totalGroundingErrors}`);
  console.log(`  RESULT   ${allPassed ? "PASS ✅" : "FAIL ❌"}\n`);

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
