# System Design — Answerlight

*Draft the Answer. Trust it in minutes.*

This document covers the architecture, data model, control flow, and the design
decisions behind them. For the product rationale (why this workflow), see the
[README](../README.md).

---

## 1. Design goals

| Goal | How it shows up in the system |
|---|---|
| **Trustworthy output** | Grounding is enforced in code; the model can't emit an incomplete or invented Answer |
| **Auditable, not magic** | Every response links to a source paragraph; every step is timed and surfaced |
| **Robust on flaky free-tier infra** | Retries + timeouts on LLM calls; deterministic self-healing of model output |
| **Provider-portable** | One factory swaps Gemini ↔ Claude with no agent-code changes |
| **Generalizes across real filings** | String paragraph labels, per-jurisdiction deadlines, OCR-noise handling |

The throughline: **the LLM is used only for judgment; everything where "correct"
is well-defined is deterministic.**

---

## 2. Component view

```mermaid
flowchart TB
  subgraph Client["Browser (Next.js client)"]
    UI["CaseWorkspace<br/>grounded split view · inline edits · export"]
  end

  subgraph Server["Next.js server (Node runtime)"]
    Page["/case/[id]  (RSC)"]
    API["/api/generate  (route handler)"]
    Loader["complaints.ts<br/>load + Zod-validate fixtures"]
    subgraph Pipeline["Agent pipeline (lib/agent)"]
      direction TB
      Classify["classify  (LLM)"]
      Defenses["defenses  (LLM)"]
      Reconcile["reconcile  (deterministic, self-healing)"]
      Deadline["deadlines  (deterministic)"]
      Assemble["assemble  (deterministic)"]
      Validate["validate  (deterministic)"]
    end
    Provider["llm/provider · llm/call<br/>model factory + retry/timeout"]
  end

  subgraph Data["Data (repo)"]
    Fixtures["data/complaints/*.json"]
    Gold["evals/gold/*.json"]
  end

  Ext["LLM API<br/>Gemini 2.5 Flash · or Claude"]

  UI -->|POST complaintId| API
  Page --> Loader
  API --> Loader
  Loader --> Fixtures
  API --> Pipeline
  Classify --> Provider
  Defenses --> Provider
  Provider --> Ext
  Pipeline --> API
  API -->|GenerationResult + rendered| UI
  Gold -.->|npm run eval| Pipeline
```

---

## 3. Request flow (drafting an Answer)

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant W as CaseWorkspace
  participant A as /api/generate
  participant P as pipeline
  participant L as LLM (Gemini/Claude)

  U->>W: Click "Draft the Answer"
  W->>A: POST { complaintId }
  A->>A: load + Zod-validate complaint
  par concurrent LLM steps (with retry/timeout)
    A->>P: classifyAllegations()
    P->>L: structured generateObject (per-¶ responses)
    and
    A->>P: proposeDefenses()
    P->>L: structured generateObject (defenses)
  end
  P->>P: reconcile() — dedupe, drop invented, backfill missing
  P->>P: computeDeadline() — rule table
  P->>P: assemble() — filing text
  P->>P: validate() — grounding invariants
  A-->>W: { answer, issues, rendered, timings }
  W->>U: split view — hover a reply to light up its source ¶
```

Concurrency: `classify` and `defenses` are independent and run with
`Promise.all`. Both are wrapped in `withRetry` (exponential backoff + 45s abort).

---

## 4. The trust boundary — who owns "correct"

```mermaid
flowchart LR
  subgraph Judgment["LLM — judgment"]
    J1["per-paragraph admit/deny/insufficient"]
    J2["affirmative-defense selection"]
  end
  subgraph Deterministic["Code — correctness (testable)"]
    D1["paragraph identity & completeness"]
    D2["no hallucinated / duplicate grounding"]
    D3["response deadline (rule table)"]
    D4["document assembly (templating)"]
    D5["self-healing reconciliation"]
  end
  Judgment --> Deterministic
```

A dropped paragraph, an invented one, or a wrong deadline are *substantive*
defects in a legal filing — so none of those are left to the model. The
[reconcile](../lib/agent/reconcile.ts) step guarantees the output always has
exactly one grounded response per allegation, repairing model mistakes and
flagging the repairs; [validate](../lib/agent/validate.ts) then asserts the
invariant. The same validators back the eval harness.

**Backfill safety rule:** a synthesized response is *never* an admission —
admitting is the only move that can concede liability, so backfills are always a
denial-equivalent, low-confidence, and flagged for attorney review.

---

## 5. Data model

```mermaid
classDiagram
  class Complaint {
    id
    provenance
    causesOfAction[]
    prayerForRelief[]
  }
  class ComplaintCaption {
    court; county; state
    caseNumber; jurisdiction
    plaintiffs[]; defendants[]
  }
  class Allegation {
    label  «grounding key (string)»
    ordinal «sort order (int)»
    type; section; text
    incorporatesRefs[]; ocrNoise
  }
  class AnswerDocument {
    prayer[]; deadline; model
  }
  class AllegationResponse {
    allegationLabel «FK -> Allegation.label»
    responseType; responseText
    rationale; confidence; flags[]
  }
  class AffirmativeDefense {
    number; name; text; basis
  }
  Complaint "1" --> "1" ComplaintCaption
  Complaint "1" --> "many" Allegation
  AnswerDocument "1" --> "1" ComplaintCaption
  AnswerDocument "1" --> "many" AllegationResponse
  AnswerDocument "1" --> "many" AffirmativeDefense
  AllegationResponse ..> Allegation : grounds to (label)
```

Key decisions:

- **`label` is a string, not a number.** Real complaints number paragraphs
  inconsistently — `1`, `1.1`, `2.16`, sometimes `FIRST`. The grounding key is
  whatever the filing used; a separate integer `ordinal` owns sort order so
  display never depends on parsing `"2.16"` as a number.
- **`responseText` (filed) is separate from `rationale` (why).** The rationale is
  reviewer-facing and never appears in the document.
- **`provenance` is part of the model**, so "this is real public data" is
  auditable rather than asserted.
- Everything is a **Zod schema** — fixtures are validated on read, model output is
  parsed into the same types, and the eval cross-checks gold against the schema.

---

## 6. Response taxonomy (FRCP 8(b))

```mermaid
flowchart TD
  S["A numbered allegation"] --> Q1{Statement of law<br/>or jury demand?}
  Q1 -- yes --> NRR["no_response_required"]
  Q1 -- no --> Q2{Safe, verifiable fact<br/>about defendant?}
  Q2 -- yes --> AD["admit"]
  Q2 -- no --> Q3{Solely within<br/>plaintiff's knowledge?}
  Q3 -- yes --> IK["insufficient_knowledge<br/>(= denial, Rule 8(b)(5))"]
  Q3 -- no --> Q4{Mixed fact +<br/>conclusion?}
  Q4 -- yes --> PA["partial"]
  Q4 -- no --> DN["deny"]
```

This is the heuristic encoded in the [classify](../lib/agent/classify.ts) system
prompt and the hand-labeled [gold standard](../evals/gold).

---

## 7. Evaluation

`npm run eval` runs the real pipeline against hand-labeled gold and scores:

- **Classification accuracy** — response ∈ the *acceptable set* for each paragraph
  (legal drafting has more than one defensible answer, so gold encodes a primary
  plus acceptable alternatives).
- **Grounding errors** — reusing the production validators (completeness,
  hallucination, duplicates).

Pass bar: ≥85% accuracy and zero grounding errors per case. Current: **~94%
overall, 0 grounding errors** across the three sample cases.

`npm test` (Vitest) covers the deterministic core in isolation: grounding
invariants, deadline rules, self-healing reconciliation (incl. the never-admit
safety rule), document assembly determinism, the retry wrapper, and
fixture/gold integrity.

---

## 8. Failure modes & handling

| Failure | Handling |
|---|---|
| LLM timeout / rate-limit | `withRetry`: 3 attempts, exponential backoff, 45s abort |
| Model omits a paragraph | `reconcile` backfills a conservative default, flags it |
| Model invents a paragraph | `reconcile` drops it, flags it |
| Model duplicates a paragraph | `reconcile` keeps first, drops rest |
| Model returns low confidence | surfaced as a review warning in the UI |
| Missing API key | API returns a clear 400 with a link to a free key |
| Unknown jurisdiction deadline | conservative default + explicit "VERIFY" flag |
| Malformed fixture | Zod throws on load — fails loud, not silent |

---

## 9. What would change for production

- Persist drafts + a full edit/audit trail (who changed which response, when).
- `.docx` export with firm caption templates; e-filing integration.
- A second-pass "critic" model that flags any response readable as an admission
  of liability before a human sees it.
- Expand the eval set across claim types; wire accuracy as a CI regression gate.
- Live complaint ingestion (PACER/RECAP) with a human-in-the-loop segmentation
  review for arbitrary uploads.
