/**
 * Answerlight logo mark: a document whose lines are "grounded" — three plain
 * paragraph lines plus one highlighted line anchored by a dot, echoing the
 * product's core idea (every response traced back to a source paragraph).
 */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Answerlight logo"
    >
      <rect width="32" height="32" rx="8" fill="#4f46e5" />
      <rect x="7" y="8" width="14" height="2.2" rx="1.1" fill="#fff" fillOpacity="0.85" />
      <rect x="7" y="13" width="18" height="2.2" rx="1.1" fill="#fff" fillOpacity="0.55" />
      {/* the grounded / highlighted line */}
      <rect x="7" y="18" width="12" height="2.6" rx="1.3" fill="#fbbf24" />
      <circle cx="23.5" cy="19.3" r="2" fill="#fbbf24" />
      <rect x="7" y="23" width="9" height="2.2" rx="1.1" fill="#fff" fillOpacity="0.55" />
    </svg>
  );
}
