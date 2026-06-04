"use client";

import { useMemo, useRef, useState } from "react";
import type {
  Complaint,
  AllegationResponse,
  ResponseType,
  GenerationResult,
  ValidationIssue,
} from "@/lib/schemas";

type ApiResult = GenerationResult & { rendered: string };

const RESPONSE_META: Record<
  ResponseType,
  { label: string; badge: string; dot: string; border: string }
> = {
  admit: {
    label: "Admit",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
    border: "border-l-amber-400",
  },
  deny: {
    label: "Deny",
    badge: "bg-zinc-100 text-zinc-800 border-zinc-200",
    dot: "bg-zinc-600",
    border: "border-l-zinc-400",
  },
  partial: {
    label: "Admit in part",
    badge: "bg-violet-100 text-violet-800 border-violet-200",
    dot: "bg-violet-500",
    border: "border-l-violet-400",
  },
  insufficient_knowledge: {
    label: "Insufficient knowledge",
    badge: "bg-sky-100 text-sky-800 border-sky-200",
    dot: "bg-sky-500",
    border: "border-l-sky-400",
  },
  no_response_required: {
    label: "No response required",
    badge: "bg-stone-100 text-stone-600 border-stone-200",
    dot: "bg-stone-400",
    border: "border-l-stone-300",
  },
};

const RESPONSE_ORDER: ResponseType[] = [
  "admit",
  "partial",
  "deny",
  "insufficient_knowledge",
  "no_response_required",
];

export default function CaseWorkspace({ complaint }: { complaint: Complaint }) {
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<"rate_limited" | "generic">(
    "generic",
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const [tab, setTab] = useState<"review" | "document">("review");
  const [overrides, setOverrides] = useState<Record<string, ResponseType>>({});
  const allegationRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const c = complaint.caption;

  async function generate() {
    setLoading(true);
    setError(null);
    setErrorKind("generic");
    setOverrides({});
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId: complaint.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "rate_limited") setErrorKind("rate_limited");
        throw new Error(data.message || data.error || "Failed");
      }
      setResult(data as ApiResult);
      setTab("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  const responsesByLabel = useMemo(() => {
    const m = new Map<string, AllegationResponse>();
    result?.answer.responses.forEach((r) => m.set(r.allegationLabel, r));
    return m;
  }, [result]);

  function effectiveType(label: string): ResponseType | undefined {
    return overrides[label] ?? responsesByLabel.get(label)?.responseType;
  }

  function scrollToAllegation(label: string) {
    const el = allegationRefs.current[label];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el) {
      el.classList.remove("flash");
      void el.offsetWidth; // restart animation
      el.classList.add("flash");
    }
  }

  const distribution = useMemo(() => {
    const counts: Partial<Record<ResponseType, number>> = {};
    if (result) {
      for (const r of result.answer.responses) {
        const t = overrides[r.allegationLabel] ?? r.responseType;
        counts[t] = (counts[t] ?? 0) + 1;
      }
    }
    return counts;
  }, [result, overrides]);

  return (
    <div>
      {/* ---- Header / caption ------------------------------------------- */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            {c.plaintiffs.join(", ")}{" "}
            <span className="text-stone-400">v.</span>{" "}
            {c.defendants.join(", ")}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {c.documentTitle} · {c.court}
            {c.state ? `, ${c.state}` : ""} · No. {c.caseNumber}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                c.jurisdiction === "federal"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-purple-50 text-purple-700"
              }`}
            >
              {c.jurisdiction === "federal" ? "Federal" : "State"} court
            </span>
            <a
              href={complaint.provenance.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 hover:underline"
            >
              Real public filing · {complaint.provenance.source} ↗
            </a>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {loading
            ? "Drafting Answer…"
            : result
              ? "Re-draft Answer"
              : "Draft the Answer"}
        </button>
      </div>

      {error &&
        (errorKind === "rate_limited" ? (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="mt-0.5 text-lg leading-none">🌤️</span>
            <div>
              <div className="font-semibold text-amber-900">
                Free API limit reached for today
              </div>
              <p className="mt-1 leading-relaxed">
                This is an academic / portfolio project running on free AI APIs,
                and the daily free-tier limit has been hit. Please check back
                later — the free quota resets each day. Thanks for understanding!
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ))}

      {result && <DeadlineBanner deadline={result.answer.deadline} />}
      {result && (
        <StatsBar
          result={result}
          distribution={distribution}
          edited={Object.keys(overrides).length}
        />
      )}

      {result && (
        <div className="mb-4 inline-flex rounded-lg border border-stone-200 bg-white p-0.5 text-sm">
          {(["review", "document"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                tab === t
                  ? "bg-stone-900 text-white"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              {t === "review" ? "Grounded review" : "Answer document"}
            </button>
          ))}
        </div>
      )}

      {/* ---- Body ------------------------------------------------------- */}
      {tab === "document" && result ? (
        <DocumentView rendered={rebuildRendered(result, overrides)} />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Complaint column */}
          <section>
            <ColumnHeader
              title="Complaint"
              subtitle={`${complaint.allegations.length} numbered allegations`}
            />
            <ul className="space-y-2">
              {complaint.allegations.map((a) => {
                const resp = responsesByLabel.get(a.label);
                const type = effectiveType(a.label);
                const active = hovered === a.label;
                return (
                  <li
                    key={a.label}
                    ref={(el) => {
                      allegationRefs.current[a.label] = el;
                    }}
                    onMouseEnter={() => setHovered(a.label)}
                    onMouseLeave={() => setHovered(null)}
                    className={`rounded-lg border border-l-[3px] bg-white p-3 text-sm transition ${
                      type ? RESPONSE_META[type].border : "border-l-stone-200"
                    } ${
                      active
                        ? "border-indigo-400 ring-2 ring-indigo-100"
                        : "border-stone-200"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="inline-flex h-5 items-center justify-center rounded bg-stone-900 px-1.5 text-xs font-semibold text-white">
                        {a.label}
                      </span>
                      {a.section && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                          {a.section}
                        </span>
                      )}
                      {a.ocrNoise && (
                        <span
                          title="Source text had OCR noise; agent flagged it"
                          className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700"
                        >
                          OCR
                        </span>
                      )}
                      {type && (
                        <span
                          className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${RESPONSE_META[type].badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${RESPONSE_META[type].dot}`}
                          />
                          {RESPONSE_META[type].label}
                        </span>
                      )}
                    </div>
                    <p className="leading-relaxed text-stone-700">{a.text}</p>
                    {resp && active && (
                      <p className="mt-2 rounded bg-stone-50 px-2 py-1 text-xs text-stone-500">
                        <span className="font-semibold">Why:</span>{" "}
                        {resp.rationale}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Answer column */}
          <section>
            <ColumnHeader
              title="Defendant's Answer"
              subtitle={
                result
                  ? `${result.answer.responses.length} responses · ${result.answer.affirmativeDefenses.length} affirmative defenses`
                  : "Not yet drafted"
              }
            />

            {!result && !loading && <EmptyState />}
            {loading && <LoadingState />}

            {result && (
              <>
                <IssuesPanel issues={result.issues} onJump={scrollToAllegation} />

                <ul className="space-y-2">
                  {result.answer.responses.map((r) => {
                    const type = overrides[r.allegationLabel] ?? r.responseType;
                    const active = hovered === r.allegationLabel;
                    const edited = overrides[r.allegationLabel] !== undefined;
                    return (
                      <li
                        key={r.allegationLabel}
                        onMouseEnter={() => setHovered(r.allegationLabel)}
                        onMouseLeave={() => setHovered(null)}
                        className={`rounded-lg border border-l-[3px] bg-white p-3 text-sm transition ${
                          RESPONSE_META[type].border
                        } ${
                          active
                            ? "border-indigo-400 ring-2 ring-indigo-100"
                            : "border-stone-200"
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <button
                            onClick={() => scrollToAllegation(r.allegationLabel)}
                            title="Jump to source paragraph"
                            className="inline-flex h-5 items-center justify-center rounded bg-indigo-600 px-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                          >
                            ¶{r.allegationLabel}
                          </button>
                          <select
                            value={type}
                            onChange={(e) =>
                              setOverrides((o) => ({
                                ...o,
                                [r.allegationLabel]: e.target
                                  .value as ResponseType,
                              }))
                            }
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${RESPONSE_META[type].badge}`}
                          >
                            {RESPONSE_ORDER.map((t) => (
                              <option key={t} value={t}>
                                {RESPONSE_META[t].label}
                              </option>
                            ))}
                          </select>
                          {edited && (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">
                              edited
                            </span>
                          )}
                          <span className="ml-auto text-[11px] text-stone-400">
                            {Math.round(r.confidence * 100)}% conf
                          </span>
                        </div>
                        <p className="leading-relaxed text-stone-700">
                          {edited
                            ? standardResponseText(r.allegationLabel, type)
                            : r.responseText}
                        </p>
                        {r.flags && r.flags.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {r.flags.map((f) => (
                              <span
                                key={f}
                                className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <DefensesPanel defenses={result.answer.affirmativeDefenses} />
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function ColumnHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="sticky top-14 z-10 mb-2 -mx-1 bg-[#f6f6f4]/90 px-1 pb-2 pt-1 backdrop-blur">
      <h2 className="text-sm font-semibold text-stone-800">{title}</h2>
      <p className="text-xs text-stone-400">{subtitle}</p>
    </div>
  );
}

function DeadlineBanner({
  deadline,
}: {
  deadline: GenerationResult["answer"]["deadline"];
}) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm">
      <span className="text-lg">⏱️</span>
      <div>
        <span className="font-semibold text-amber-900">
          Response due in {deadline.daysToRespond} days
        </span>{" "}
        <span className="text-amber-700">
          — {deadline.rule}. {deadline.note}
        </span>
      </div>
    </div>
  );
}

function StatsBar({
  result,
  distribution,
  edited,
}: {
  result: ApiResult;
  distribution: Partial<Record<ResponseType, number>>;
  edited: number;
}) {
  const total = result.answer.responses.length;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-xs text-stone-500">
      <span>
        <span className="font-semibold text-stone-800">{total}</span> responses
      </span>
      <span className="flex flex-wrap items-center gap-2">
        {RESPONSE_ORDER.map((t) =>
          distribution[t] ? (
            <span key={t} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${RESPONSE_META[t].dot}`} />
              {distribution[t]} {RESPONSE_META[t].label.toLowerCase()}
            </span>
          ) : null,
        )}
      </span>
      <span className="ml-auto flex items-center gap-4">
        {edited > 0 && <span className="text-indigo-600">{edited} edited</span>}
        <span>
          {result.answer.model} · {result.timings.llm_total}ms
        </span>
      </span>
    </div>
  );
}

function IssuesPanel({
  issues,
  onJump,
}: {
  issues: ValidationIssue[];
  onJump: (label: string) => void;
}) {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
        ✓ Grounding validated — every allegation answered exactly once, no
        invented paragraphs.
      </div>
    );
  }

  return (
    <div className="mb-3 space-y-1">
      {[...errors, ...warnings].map((i, idx) => (
        <button
          key={idx}
          onClick={() => i.allegationLabel && onJump(i.allegationLabel)}
          className={`block w-full rounded-lg border px-3 py-2 text-left text-xs ${
            i.severity === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {i.severity === "error" ? "✕" : "⚠"} {i.message}
        </button>
      ))}
    </div>
  );
}

function DefensesPanel({
  defenses,
}: {
  defenses: GenerationResult["answer"]["affirmativeDefenses"];
}) {
  const [open, setOpen] = useState(true);
  if (!defenses.length) return null;
  return (
    <div className="mt-4 rounded-lg border border-stone-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-semibold text-stone-800"
      >
        <span>Affirmative defenses ({defenses.length})</span>
        <span className="text-stone-400">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <ul className="space-y-2 px-3 pb-3">
          {defenses.map((d) => (
            <li
              key={d.number}
              className="rounded-md border border-stone-100 bg-stone-50 p-2.5 text-sm"
            >
              <div className="font-medium text-stone-800">
                {d.number}. {d.name}
              </div>
              <p className="mt-0.5 text-stone-600">{d.text}</p>
              <p className="mt-1 text-xs text-stone-400">
                <span className="font-semibold">Basis:</span> {d.basis}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DocumentView({ rendered }: { rendered: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(rendered);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  function download() {
    const blob = new Blob([rendered], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "answer.txt";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button
          onClick={copy}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button
          onClick={download}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Download .txt
        </button>
      </div>
      <pre className="legal-doc whitespace-pre-wrap rounded-xl border border-stone-200 bg-white p-8 text-[13px] leading-relaxed text-stone-800 shadow-sm">
        {rendered}
      </pre>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
      <p className="mb-3 font-medium text-stone-700">
        The pipeline runs five steps:
      </p>
      <ol className="mx-auto max-w-sm space-y-1.5 text-left">
        {[
          "Segment — the complaint is structured into numbered allegations (pre-verified here).",
          "Classify — each paragraph → admit / deny / insufficient knowledge (LLM).",
          "Defenses — affirmative defenses inferred from the claims (LLM).",
          "Assemble — a filing-formatted Answer (deterministic).",
          "Validate — grounding & deadline checked in code (deterministic).",
        ].map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-semibold text-indigo-600">{i + 1}.</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-stone-400">
        Press “Draft the Answer” to run it.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-lg border border-stone-200 bg-stone-100"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client-side helpers for edited responses + document rebuild
// ---------------------------------------------------------------------------

function standardResponseText(label: string, type: ResponseType): string {
  switch (type) {
    case "admit":
      return `Defendant admits the allegations in Paragraph ${label}.`;
    case "deny":
      return `Defendant denies the allegations in Paragraph ${label}.`;
    case "partial":
      return `Defendant admits in part and denies in part the allegations in Paragraph ${label}, and denies any remaining allegations.`;
    case "insufficient_knowledge":
      return `Defendant lacks knowledge or information sufficient to form a belief as to the truth of the allegations in Paragraph ${label}, and therefore denies them.`;
    case "no_response_required":
      return `Paragraph ${label} states a legal conclusion to which no response is required; to the extent a response is required, Defendant denies the allegations.`;
  }
}

/** Re-render the document text honoring any user edits to response types. */
function rebuildRendered(
  result: ApiResult,
  overrides: Record<string, ResponseType>,
): string {
  if (Object.keys(overrides).length === 0) return result.rendered;
  let out = result.rendered;
  for (const r of result.answer.responses) {
    const t = overrides[r.allegationLabel];
    if (!t) continue;
    const line = `${r.allegationLabel}. ${r.responseText}`;
    const patched = `${r.allegationLabel}. ${standardResponseText(
      r.allegationLabel,
      t,
    )}`;
    out = out.replace(line, patched);
  }
  return out;
}
