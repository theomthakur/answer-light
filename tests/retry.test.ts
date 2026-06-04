import { describe, it, expect } from "vitest";
import { withRetry } from "../lib/llm/call";

describe("withRetry", () => {
  it("returns the result on first success", async () => {
    let calls = 0;
    const out = await withRetry(
      async () => {
        calls++;
        return "ok";
      },
      { label: "t" },
    );
    expect(out).toBe("ok");
    expect(calls).toBe(1);
  });

  it("retries on failure then succeeds", async () => {
    let calls = 0;
    const out = await withRetry(
      async () => {
        calls++;
        if (calls < 2) throw new Error("flaky");
        return "recovered";
      },
      { label: "t", retries: 3, baseDelayMs: 1 },
    );
    expect(out).toBe("recovered");
    expect(calls).toBe(2);
  });

  it("throws a labeled error after exhausting retries", async () => {
    await expect(
      withRetry(
        async () => {
          throw new Error("always");
        },
        { label: "classify", retries: 1, baseDelayMs: 1 },
      ),
    ).rejects.toThrow(/classify failed after 2 attempt/);
  });

  it("passes an AbortSignal to the callback", async () => {
    const out = await withRetry(
      async (signal) => {
        expect(signal).toBeInstanceOf(AbortSignal);
        return signal.aborted;
      },
      { label: "t" },
    );
    expect(out).toBe(false);
  });
});
