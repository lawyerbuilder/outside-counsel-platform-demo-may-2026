import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests within limit", () => {
    const key = `test-${Date.now()}-1`;
    const r1 = checkRateLimit(key, { limit: 3, windowMs: 60_000 });
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, { limit: 3, windowMs: 60_000 });
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);
  });

  it("blocks requests over limit", () => {
    const key = `test-${Date.now()}-2`;
    const config = { limit: 2, windowMs: 60_000 };
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const r3 = checkRateLimit(key, config);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it("returns resetAt in the future", () => {
    const key = `test-${Date.now()}-3`;
    const result = checkRateLimit(key, { limit: 5, windowMs: 30_000 });
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});
