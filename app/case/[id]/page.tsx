import Link from "next/link";
import { notFound } from "next/navigation";
import { getComplaint, listComplaints } from "@/lib/complaints";
import CaseWorkspace from "@/components/CaseWorkspace";

export function generateStaticParams() {
  return listComplaints().map((c) => ({ id: c.id }));
}

const LEGEND: { label: string; dot: string }[] = [
  { label: "Admit", dot: "bg-amber-500" },
  { label: "Deny", dot: "bg-zinc-600" },
  { label: "Insufficient knowledge", dot: "bg-sky-500" },
  { label: "Admit in part", dot: "bg-violet-500" },
  { label: "No response required", dot: "bg-stone-400" },
];

export default function CasePage({ params }: { params: { id: string } }) {
  const complaint = getComplaint(params.id);
  if (!complaint) notFound();

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-4">
        <Link href="/" className="text-sm text-stone-500 hover:text-indigo-700">
          ← All cases
        </Link>
      </div>

      {/* Plain-language helper for first-time users */}
      <details className="group mb-5 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-indigo-900">
          <span>New here? How to read this page</span>
          <span className="text-indigo-400 transition group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <div className="mt-3 space-y-3 text-stone-600">
          <p>
            Press{" "}
            <span className="font-medium text-stone-800">“Draft the Answer”</span>{" "}
            and the AI reads this lawsuit and writes the defendant's reply. Then:
          </p>
          <ul className="ml-1 space-y-1.5">
            <li>
              <span className="font-medium text-stone-800">Left column</span> = the
              complaint (the accusations). <span className="font-medium text-stone-800">Right column</span>{" "}
              = the drafted Answer (the replies).
            </li>
            <li>
              <span className="font-medium text-stone-800">Hover any reply</span> to
              light up the exact paragraph it answers — that's the “grounding,” so
              you can verify nothing was made up.
            </li>
            <li>
              The{" "}
              <span className="font-medium text-stone-800">amber deadline bar</span>{" "}
              shows how long the defendant legally has to respond.
            </li>
            <li>
              Disagree with a reply? Change it with the dropdown — the final
              document updates. Then use the{" "}
              <span className="font-medium text-stone-800">“Answer document”</span>{" "}
              tab to copy or download it.
            </li>
          </ul>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-indigo-100 pt-3">
            {LEGEND.map((l) => (
              <span
                key={l.label}
                className="flex items-center gap-1.5 text-xs text-stone-600"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${l.dot}`} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      </details>

      <CaseWorkspace complaint={complaint} />
    </main>
  );
}
