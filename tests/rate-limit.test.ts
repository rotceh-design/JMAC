import { describe, it, expect } from "vitest";

// Rate limiter logic (extracted for testing)
class RateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>();

  check(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (record.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: maxRequests - record.count };
  }

  clear() {
    this.store.clear();
  }
}

describe("Rate Limiter", () => {
  const limiter = new RateLimiter();

  it("allows requests within limit", () => {
    limiter.clear();
    const result = limiter.check("test:ip", 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks requests exceeding limit", () => {
    limiter.clear();
    for (let i = 0; i < 5; i++) {
      limiter.check("test:ip", 5, 60000);
    }
    const result = limiter.check("test:ip", 5, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks different keys independently", () => {
    limiter.clear();
    limiter.check("test:ip1", 5, 60000);
    limiter.check("test:ip1", 5, 60000);
    limiter.check("test:ip1", 5, 60000);

    const result = limiter.check("test:ip2", 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("resets after window expires", () => {
    limiter.clear();
    // Use a very short window for testing
    limiter.check("test:reset", 2, 1); // 1ms window
    
    // Wait for window to expire
    const start = Date.now();
    while (Date.now() - start < 5) {
      // Busy wait
    }

    const result = limiter.check("test:reset", 2, 1);
    expect(result.allowed).toBe(true);
  });

  it("decrements remaining count correctly", () => {
    limiter.clear();
    const r1 = limiter.check("test:count", 3, 60000);
    expect(r1.remaining).toBe(2);

    const r2 = limiter.check("test:count", 3, 60000);
    expect(r2.remaining).toBe(1);

    const r3 = limiter.check("test:count", 3, 60000);
    expect(r3.remaining).toBe(0);
  });
});
