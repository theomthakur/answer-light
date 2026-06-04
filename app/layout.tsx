import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { Logo } from "@/components/Logo";
import { SocialLinks } from "@/components/SocialLinks";

export const metadata: Metadata = {
  metadataBase: new URL("https://answer-light.vercel.app"),
  title: "Answerlight — Draft the Answer. Trust it in minutes.",
  description:
    "An academic / portfolio project: an AI agent that drafts a defendant's Answer to a real civil complaint, grounded paragraph-by-paragraph and validated in code. Not legal advice.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Answerlight — Draft the Answer. Trust it in minutes.",
    description:
      "An AI agent that drafts a defendant's Answer to a real civil complaint, grounded paragraph-by-paragraph and validated in code. An academic / portfolio project — not legal advice.",
    url: "https://answer-light.vercel.app",
    siteName: "Answerlight",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Answerlight — Draft the Answer. Trust it in minutes.",
    description:
      "An AI agent that drafts a defendant's Answer to a real civil complaint, grounded and validated in code. Academic / portfolio project — not legal advice.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* Global academic-project disclaimer — present on every page. */}
        <div className="bg-stone-900 px-4 py-1.5 text-center text-xs text-stone-300">
          <span className="font-semibold text-amber-300">Academic project</span>{" "}
          — a portfolio demo, not a law firm or a legal service. Outputs are
          AI-generated drafts on public court records,{" "}
          <span className="text-stone-100">not legal advice</span>. Provided “as
          is,” with no warranty and no liability — use at your own risk.
        </div>

        <AppHeader />

        <div className="flex-1">{children}</div>

        <footer className="border-t border-stone-200 bg-white px-6 py-8">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Logo className="h-6 w-6" />
                <span className="font-semibold tracking-tight text-stone-800">
                  Answerlight
                </span>
                <span className="hidden text-sm text-stone-400 sm:inline">
                  · Draft the Answer. Trust it in minutes.
                </span>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-stone-400">
                  Built by Theom Thakur
                </span>
                <SocialLinks />
                <a
                  href="https://github.com/theomthakur/answer-light"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-stone-400 transition hover:text-indigo-600 hover:underline"
                >
                  View the source code on GitHub →
                </a>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-xs leading-relaxed text-stone-400">
              An independent academic / portfolio project built to demonstrate
              engineering and product judgment. Not affiliated with, endorsed by,
              or providing services to any law firm or client. Complaints shown
              are real public court records used for demonstration; generated
              Answers are illustrative drafts, contain no legal advice, and must
              be reviewed by a licensed attorney before any use.
            </p>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-stone-400">
              This project is provided “as is,” without any warranty of any kind,
              express or implied. The author accepts no responsibility or
              liability for any errors, omissions, or for any loss, damage, or
              consequences of any kind arising from the use of, or reliance on,
              this project or its AI-generated output. Use is entirely at your
              own risk.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
