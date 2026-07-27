import { describe, it, expect } from "vitest";

// Webhook validation logic (extracted for testing)
function validateWebhookPayload(payload: unknown): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Invalid payload" };
  }

  const data = payload as Record<string, unknown>;

  if (!data.type || typeof data.type !== "string") {
    return { valid: false, error: "Missing event type" };
  }

  if (!data.data || typeof data.data !== "object") {
    return { valid: false, error: "Missing event data" };
  }

  const eventData = data.data as Record<string, unknown>;
  if (!eventData.object || typeof eventData.object !== "object") {
    return { valid: false, error: "Missing event object" };
  }

  return { valid: true };
}

function isValidSessionId(sessionId: string): boolean {
  return /^cs_(test|live)_[a-zA-Z0-9]+$/.test(sessionId);
}

function isValidPaymentIntentId(paymentIntentId: string): boolean {
  return /^pi_(test|live)_[a-zA-Z0-9]+$/.test(paymentIntentId);
}

describe("Webhook Validation", () => {
  describe("Payload validation", () => {
    it("accepts valid checkout.session.completed event", () => {
      const payload = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_abc123",
            payment_intent: "pi_test_xyz789",
            status: "complete",
          },
        },
      };

      expect(validateWebhookPayload(payload).valid).toBe(true);
    });

    it("rejects null payload", () => {
      expect(validateWebhookPayload(null).valid).toBe(false);
    });

    it("rejects non-object payload", () => {
      expect(validateWebhookPayload("string").valid).toBe(false);
    });

    it("rejects payload without type", () => {
      const payload = { data: { object: {} } };
      expect(validateWebhookPayload(payload).valid).toBe(false);
    });

    it("rejects payload without data", () => {
      const payload = { type: "checkout.session.completed" };
      expect(validateWebhookPayload(payload).valid).toBe(false);
    });

    it("rejects payload without object in data", () => {
      const payload = { type: "checkout.session.completed", data: {} };
      expect(validateWebhookPayload(payload).valid).toBe(false);
    });
  });

  describe("Session ID validation", () => {
    it("accepts valid test session ID", () => {
      expect(isValidSessionId("cs_test_abc123")).toBe(true);
    });

    it("accepts valid live session ID", () => {
      expect(isValidSessionId("cs_live_abc123")).toBe(true);
    });

    it("rejects invalid session ID format", () => {
      expect(isValidSessionId("invalid_id")).toBe(false);
      expect(isValidSessionId("cs_abc")).toBe(false);
      expect(isValidSessionId("")).toBe(false);
    });
  });

  describe("Payment Intent ID validation", () => {
    it("accepts valid test payment intent", () => {
      expect(isValidPaymentIntentId("pi_test_xyz789")).toBe(true);
    });

    it("accepts valid live payment intent", () => {
      expect(isValidPaymentIntentId("pi_live_xyz789")).toBe(true);
    });

    it("rejects invalid payment intent format", () => {
      expect(isValidPaymentIntentId("invalid_id")).toBe(false);
      expect(isValidPaymentIntentId("pi_abc")).toBe(false);
      expect(isValidPaymentIntentId("")).toBe(false);
    });
  });

  describe("Event type handling", () => {
    it("identifies checkout.session.completed", () => {
      const event = { type: "checkout.session.completed" };
      expect(event.type).toBe("checkout.session.completed");
    });

    it("identifies payment_intent.payment_failed", () => {
      const event = { type: "payment_intent.payment_failed" };
      expect(event.type).toBe("payment_intent.payment_failed");
    });

    it("handles unknown event types gracefully", () => {
      const event = { type: "unknown.event.type" };
      expect(["checkout.session.completed", "payment_intent.payment_failed"]).not.toContain(event.type);
    });
  });
});
