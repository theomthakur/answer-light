<div align="center">

# ⚖️ Answerlight

### Draft the Answer. Trust it in minutes.

An AI agent that drafts a defendant's **Answer** to a real civil **complaint** —
responding to every numbered allegation, pleading the affirmative defenses, and
**grounding every reply to the exact paragraph it answers**, with the grounding
verified in code.

`Next.js` · `TypeScript` · `Vercel AI SDK` · `Gemini 2.5 Flash (free tier) / Claude` · `Zod` · `Vitest`

> **Academic / portfolio project** — a demo of engineering and product judgment.
> Not a law firm, not a legal service, not legal advice. Complaints shown are real
> public court records; generated Answers require attorney review.
>
> **Disclaimer & no liability:** This project is provided "as is," without warranty
> of any kind, express or implied. The author accepts **no responsibility or
> liability** for any errors, omissions, or for any loss, damage, or consequences
> of any kind arising from its use or from reliance on its AI-generated output.
> Use is entirely at your own risk.

**[Live demo](https://answer-light.vercel.app/)** · **[System design](docs/ARCHITECTURE.md)** · **[How it's evaluated](#evaluation)**

</div>

---

## The problem

When a business is served with a lawsuit, someone — usually a paralegal under
attorney supervision — must draft the **Answer**: a response to *every* numbered
allegation (admit, deny, or plead insufficient knowledge), plus the **affirmative
defenses** (waived if not pleaded), all before a hard, jurisdiction-specific
deadline. It's high-volume, repetitive, mechanical in parts and genuinely
judgment-heavy in others — exactly the shape of work a forward-deployed AI system
should take off a firm's plate.

## The insight (product judgment)

Any LLM can draft a plausible Answer. The reason firms don't *ship* the draft is
they can't **trust** it — a dropped paragraph or an accidental *admission* of
liability is malpractice. So the product isn't "generate an Answer," it's
**"generate an Answer a paralegal can verify in 90 seconds and an attorney can
sign."** That reframing drove every decision below.

I chose this workflow over PI demand letters (input is PHI — can't use real data)
and an AI-citation guard (verification, not generation). Complaints are public
record, the output is the document-generation artifact, and the work is bounded
enough to do *well* while still mattering.

## What it does

1. **Segment** a complaint into numbered allegations, causes of action, prayer.
2. **Classify** each allegation → `admit` / `deny` / `insufficient knowledge` /
   `partial` / `no response required` using real FRCP 8(b) heuristics.
3. **Propose affirmative defenses** tied to the specific claims.
4. **Reconcile** — deterministically guarantee one grounded response per
   allegation, self-healing any model mistake.
5. **Assemble** a filing-formatted Answer; **compute** the response deadline;
   **validate** the grounding — all in code.

## The core idea: LLM for judgment, code for correctness

The model is trusted only with judgment; anything where "correct" is well-defined
is deterministic and auditable.

| Concern | Owner |
|---|---|
| Per-paragraph response · defense selection | **LLM** |
| Paragraph identity, completeness, no hallucinated/duplicate grounding | **Code** |
| Self-healing of dropped/invented/duplicated responses | **Code** |
| Response deadline · document assembly | **Code** |

A backfilled (model-omitted) response is **never an admission** — admitting is the
only move that can concede liability, so repairs are always a denial-equivalent,
low-confidence, and flagged for review. Full diagrams in
**[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## The three sample cases (real public filings)

Chosen to prove the pipeline generalizes, not to cherry-pick one happy path:

| Case | Jurisdiction | Claim type | What it stresses |
|---|---|---|---|
| **Ortiz v. Wal-Mart** | New Mexico (state) | Premises-liability negligence | Integer numbering; heavy OCR noise; 30-day deadline |
| **Cheek v. Hoonah City School District** | U.S. District Court, Alaska (**federal**) | 42 U.S.C. § 1983 retaliation | **21-day FRCP** deadline; **decimal** labels (`2.16`); incorporation-by-reference |
| **Morton-Maxson v. University of Washington** | Washington (state) | Medical negligence (public entity) | Admit-own-records vs. deny-negligence split; very noisy OCR; 20-day deadline |

State/federal · three claim types · 20/21/30-day deadlines · integer vs. decimal
numbering — the spread that pushed the grounding key from an integer to a string
`label`.

## Architecture

```
app/
  page.tsx                 branded landing + plain-language how-to
  case/[id]/page.tsx       RSC: loads a complaint -> CaseWorkspace
  api/generate/route.ts    runs the pipeline (Node runtime)
components/
  CaseWorkspace.tsx        grounded split view, inline overrides, export
  AppHeader.tsx · Logo.tsx brand chrome
lib/
  schemas.ts               Zod data model — the contract for everything
  complaints.ts            fixture loader (validates on read)
  llm/provider.ts          provider-agnostic model factory (Gemini ↔ Claude)
  llm/call.ts              retry + timeout wrapper
  agent/
    classify.ts            per-paragraph response (LLM)
    defenses.ts            affirmative defenses (LLM)
    reconcile.ts           self-healing grounding (deterministic)
    assemble.ts            structured Answer -> filing text (deterministic)
    deadlines.ts           response-deadline rules (deterministic)
    validate.ts            grounding invariants (deterministic)
    pipeline.ts            orchestrator (classify ∥ defenses → reconcile → assemble)
data/complaints/*.json     verified real complaints + provenance
evals/                     gold labels + harness
tests/                     Vitest unit + integrity tests
docs/ARCHITECTURE.md       system design + diagrams
```

### Provider-agnostic by design

Every model call routes through `lib/llm/provider.ts`. The demo runs on **Gemini
2.5 Flash** (free tier, no card); Glade's stack is **Claude** — so swapping the
whole pipeline is one env var, with no change to `lib/agent/*`:

```bash
LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=...
```

## Running locally

```bash
npm install
cp .env.local.example .env.local      # add a free Gemini key
npm run dev                           # http://localhost:3000
```

Free Gemini key (no card): https://aistudio.google.com/apikey

## Testing & evaluation

```bash
npm test        # Vitest — deterministic core + fixture/gold integrity (50 tests)
npm run eval    # run the agent against the hand-labeled gold standard
```

### Tests (`npm test`)
Cover the parts where "correct" is well-defined: grounding invariants, deadline
rules, **self-healing reconciliation** (including the never-admit safety rule),
document-assembly determinism, the retry wrapper, and integrity of every shipped
fixture + gold file.

### Evaluation (`npm run eval`)
Runs the **real pipeline** against hand-labeled gold and scores **classification
accuracy** (against an *acceptable set* per paragraph — legal drafting has more
than one defensible answer) and **grounding errors** (reusing the production
validators). Pass bar ≥85% accuracy, 0 grounding errors. Current: **~94% overall,
0 grounding errors** across the three cases. `EVAL_RUNS=3` checks determinism.

## Robustness

- LLM calls retry with exponential backoff + a 45s timeout (free-tier infra is
  flaky).
- The pipeline **cannot** emit an incomplete or ungrounded Answer: reconciliation
  repairs dropped/invented/duplicated responses and flags every repair.
- Unknown-jurisdiction deadlines fall back to a conservative default with an
  explicit "VERIFY" flag; malformed fixtures fail loudly on load (Zod).

## Tradeoffs deliberately made

- **Pre-verified fixtures over live PACER ingestion** — real complaints are messy
  (OCR, scans); shipped cases are human-verified for rock-solid grounding, with an
  LLM segmentation path for arbitrary uploads.
- **No database** — the data-modeling signal lives in the Zod schemas, not a CRUD
  layer; drafts live in client state.
- **`.txt` export** — firms want `.docx` with their caption styles; the rendering
  is already structured, so it's a templating swap, not a redesign.

## If this were going to production next

Persist drafts + audit trail · `.docx` export with firm templates · a second-pass
"critic" model that flags any response readable as an admission before a human
sees it · expand the eval set as a CI regression gate · live RECAP ingestion with
human-in-the-loop segmentation.

---

<div align="center">
<em>Drafts are attorney work-product aids, not legal advice. Built to be reviewed
and signed by a licensed attorney before filing.</em>
</div>
