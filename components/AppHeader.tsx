import Link from "next/link";
import { Logo } from "./Logo";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <div className="leading-tight">
            <div className="font-semibold tracking-tight text-stone-900">
              Answerlight
            </div>
            <div className="text-[11px] text-stone-500">
              Complaint → Answer, grounded
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/#how-it-works"
            className="rounded-md px-3 py-1.5 text-stone-600 transition hover:bg-stone-100 hover:text-indigo-700"
          >
            How it works
          </Link>
          <Link
            href="/#cases"
            className="rounded-md px-3 py-1.5 text-stone-600 transition hover:bg-stone-100 hover:text-indigo-700"
          >
            Cases
          </Link>
        </nav>
      </div>
    </header>
  );
}
