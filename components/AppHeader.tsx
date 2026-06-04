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
          <a
            href="https://github.com/theomthakur/answer-light"
            target="_blank"
            rel="noreferrer"
            aria-label="View source code on GitHub"
            className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-stone-200 px-3 py-1.5 text-stone-600 transition hover:border-indigo-300 hover:bg-stone-100 hover:text-indigo-700"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.2 3.44 9.6 8.21 11.16.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.4-4.04-1.4-.55-1.38-1.34-1.75-1.34-1.75-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.22 1.84 1.22 1.07 1.8 2.81 1.28 3.5.98.11-.77.42-1.28.76-1.58-2.67-.3-5.47-1.31-5.47-5.84 0-1.29.47-2.34 1.23-3.17-.12-.3-.53-1.52.12-3.16 0 0 1.01-.32 3.3 1.21a11.5 11.5 0 0 1 6 0c2.29-1.53 3.3-1.21 3.3-1.21.65 1.64.24 2.86.12 3.16.77.83 1.23 1.88 1.23 3.17 0 4.54-2.81 5.53-5.49 5.83.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58A12.3 12.3 0 0 0 24 12.29C24 5.78 18.63.5 12 .5z" />
            </svg>
            <span className="hidden sm:inline">View source</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
