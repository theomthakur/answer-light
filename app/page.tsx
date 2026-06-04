import Link from "next/link";
import { listComplaints } from "@/lib/complaints";

const PLAIN_STEPS = [
  {
    n: 1,
    title: "It reads a real complaint",
    body: "A lawsuit starts when someone (the plaintiff) files a Complaint — a numbered list of accusations. Answerlight loads a real one from public court records.",
  },
  {
    n: 2,
    title: "It answers every numbered point",
    body: "The accused party (the defendant) must reply to each point: admit it, deny it, or say they don't have enough information. The AI decides each one using standard court rules.",
  },
  {
    n: 3,
    title: "It adds the legal defenses",
    body: "It also drafts the “affirmative defenses” a lawyer would raise — the arguments for why the defendant shouldn't be held liable even if some facts are true.",
  },
  {
    n: 4,
    title: "It shows its work — and checks it",
    body: "Every reply links back to the exact paragraph it answers, and the software verifies that nothing was skipped or invented before you ever see it.",
  },
];

const HOW_TO_USE = [
  ["Pick a case", "Choose one of the sample complaints below."],
  ["Click “Draft the Answer”", "The AI reads the complaint and writes the response (about 15 seconds)."],
  [
    "Review the two columns",
    "Left is the complaint; right is the drafted Answer. Hover any reply to highlight the paragraph it answers.",
  ],
  [
    "Adjust if you disagree",
    "Use the dropdown on any reply to change admit/deny/etc. — the final document updates instantly.",
  ],
  ["Export", "Open the “Answer document” tab to copy or download the finished draft."],
];

const GLOSSARY: { label: string; dot: string; plain: string }[] = [
  { label: "Admit", dot: "bg-amber-500", plain: "“Yes, that's true.” Used only for safe facts, like the defendant's own name or address." },
  { label: "Deny", dot: "bg-zinc-600", plain: "“No, we disagree.” Used for the accusations the case actually fights about." },
  { label: "Insufficient knowledge", dot: "bg-sky-500", plain: "“We can't confirm or deny this.” Used for things only the plaintiff would know — counts as a denial." },
  { label: "Admit in part", dot: "bg-violet-500", plain: "Agrees with part of a paragraph and disagrees with the rest." },
  { label: "No response required", dot: "bg-stone-400", plain: "The paragraph is a legal statement, not a fact — so no admit/deny is needed." },
];

export default function Home() {
  const complaints = listComplaints();

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      {/* Hero */}
      <section className="mb-14">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          Draft the Answer. Trust it in minutes.
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-stone-900">
          Turn a lawsuit complaint into a drafted, grounded response.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-stone-600">
          When a business gets sued, the law gives it only a few weeks to file a
          formal reply — answering every single accusation. Answerlight reads the
          lawsuit and drafts that reply automatically, showing exactly where each
          answer comes from so a person can trust and check it in minutes.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="#cases"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
          >
            Try a sample case →
          </Link>
          <Link
            href="#how-it-works"
            className="rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            How does it work?
          </Link>
        </div>
      </section>

      {/* What's going on */}
      <section id="how-it-works" className="mb-14 scroll-mt-20">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
          What's going on here
        </h2>
        <p className="mt-2 max-w-2xl text-stone-600">
          You don't need to be a lawyer to follow along. Here's the whole idea in
          four steps:
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {PLAIN_STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-xl border border-stone-200 bg-white p-5"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                  {s.n}
                </span>
                <h3 className="font-medium text-stone-900">{s.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How to use */}
      <section className="mb-14">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
          How to use it
        </h2>
        <ol className="mt-4 space-y-3">
          {HOW_TO_USE.map(([title, body], i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-300 text-xs font-semibold text-stone-600">
                {i + 1}
              </span>
              <div>
                <span className="font-medium text-stone-900">{title}</span>
                <span className="text-stone-600"> — {body}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Glossary */}
      <section className="mb-14">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
          What the colored labels mean
        </h2>
        <p className="mt-2 max-w-2xl text-stone-600">
          Each reply is tagged with one of five responses. The same color appears
          on both the complaint and the answer so you can match them up:
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {GLOSSARY.map((g) => (
            <div
              key={g.label}
              className="flex items-start gap-2.5 rounded-lg border border-stone-200 bg-white p-3"
            >
              <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${g.dot}`} />
              <div>
                <div className="text-sm font-medium text-stone-900">
                  {g.label}
                </div>
                <div className="text-sm text-stone-600">{g.plain}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cases */}
      <section id="cases" className="scroll-mt-20">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-600">
          Sample cases ({complaints.length})
        </h2>
        <p className="mb-4 text-sm text-stone-500">
          Real, public court complaints — different states, courts, and types of
          lawsuit. Click one to draft its Answer.
        </p>
        <ul className="space-y-3">
          {complaints.map((c) => (
            <li key={c.id}>
              <Link
                href={`/case/${c.id}`}
                className="group block rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-stone-900 group-hover:text-indigo-700">
                      {c.caption.plaintiffs.join(", ")} v.{" "}
                      {c.caption.defendants.slice(0, 2).join(", ")}
                      {c.caption.defendants.length > 2 ? ", et al." : ""}
                    </div>
                    <div className="mt-1 text-sm text-stone-500">
                      {c.caption.documentTitle} · {c.caption.court}
                      {c.caption.state ? `, ${c.caption.state}` : ""}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          c.caption.jurisdiction === "federal"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-purple-50 text-purple-700"
                        }`}
                      >
                        {c.caption.jurisdiction === "federal"
                          ? "Federal court"
                          : "State court"}
                      </span>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">
                        {c.causesOfAction[0]?.name ?? "—"}
                      </span>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">
                        {c.allegations.length} allegations
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                        Real public filing
                      </span>
                    </div>
                  </div>
                  <span className="text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500">
                    →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
