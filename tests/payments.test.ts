import { describe, it, expect } from "vitest";
import type { PaymentProvider, CheckoutSession, WebhookEvent, PaymentResult } from "@/lib/payments/provider";

// Mock implementation for testing the interface contract
class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createCheckoutSession(params: {
    orderId: string;
    orderNumber: string;
    amount: number;
    currency: string;
    customerEmail: string;
    customerName: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<CheckoutSession> {
    return {
      sessionId: `mock_session_${params.orderId}`,
      url: `${params.successUrl}?session_id=mock`,
    };
  }

  async verifyWebhook(
    payload: string | Buffer,
    signature: string | null
  ): Promise<WebhookEvent | null> {
    if (!signature || signature !== "valid-signature") return null;

    const data = typeof payload === "string" ? JSON.parse(payload) : JSON.parse(payload.toString());
    return data as WebhookEvent;
  }

  async getPaymentStatus(sessionId: string): Promise<PaymentResult> {
    if (sessionId.startsWith("mock_paid_")) {
      return { success: true, sessionId };
    }
    return { success: false, sessionId };
  }
}

describe("PaymentProvider Interface", () => {
  const provider = new MockPaymentProvider();

  it("has correct name", () => {
    expect(provider.name).toBe("mock");
  });

  it("creates checkout session", async () => {
    const session = await provider.createCheckoutSession({
      orderId: "order_123",
      orderNumber: "JA-2607-ABCD",
      amount: 500000,
      currency: "clp",
      customerEmail: "test@example.com",
      customerName: "Test User",
      successUrl: "http://localhost:3000/success",
      cancelUrl: "http://localhost:3000/cancel",
    });

    expect(session.sessionId).toBeTruthy();
    expect(session.url).toBeTruthy();
    expect(session.url).toContain("success");
  });

  it("returns null for invalid webhook signature", async () => {
    const event = await provider.verifyWebhook("{}", null);
    expect(event).toBeNull();
  });

  it("returns null for wrong webhook signature", async () => {
    const event = await provider.verifyWebhook("{}", "wrong-signature");
    expect(event).toBeNull();
  });

  it("verifies valid webhook signature", async () => {
    const payload = JSON.stringify({
      type: "checkout.session.completed",
      data: { object: { id: "cs_123" } },
    });

    const event = await provider.verifyWebhook(payload, "valid-signature");
    expect(event).not.toBeNull();
    expect(event?.type).toBe("checkout.session.completed");
  });

  it("gets payment status for paid session", async () => {
    const result = await provider.getPaymentStatus("mock_paid_123");
    expect(result.success).toBe(true);
  });

  it("gets payment status for unpaid session", async () => {
    const result = await provider.getPaymentStatus("mock_unpaid_123");
    expect(result.success).toBe(false);
  });
});

describe("Webhook Event Types", () => {
  it("checkout.session.completed has required fields", () => {
    const event: WebhookEvent = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          payment_intent: "pi_test_456",
          payment_status: "paid",
        },
      },
    };

    expect(event.type).toBe("checkout.session.completed");
    expect(event.data.object.id).toBeTruthy();
  });

  it("payment_intent.payment_failed has required fields", () => {
    const event: WebhookEvent = {
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_test_789",
          status: "failed",
        },
      },
    };

    expect(event.type).toBe("payment_intent.payment_failed");
    expect(event.data.object.id).toBeTruthy();
  });
});
