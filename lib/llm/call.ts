/**
 * Resilience helpers for model calls. Free-tier endpoints rate-limit and
 * occasionally time out, so every LLM step runs through `withRetry` with
 * exponential backoff and a hard timeout — a flaky network shouldn't surface
 * as a 500 to a paralegal on a deadline.
 */

export class TimeoutError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  opts: {
    label: string;
    retries?: number;
    baseDelayMs?: number;
    timeoutMs?: number;
  },
): Promise<T> {
  const { label, retries = 2, baseDelayMs = 600, timeoutMs = 45_000 } = opts;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fn(controller.signal);
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(baseDelayMs * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(
    `${label} failed after ${retries + 1} attempt(s): ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`,
  );
}
