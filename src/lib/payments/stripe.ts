/**
 * Stripe adapter implementing PaymentProvider.
 * All Stripe-specific logic lives here — never imported outside /payments.
 */
import type {
  PaymentProvider,
  CheckoutSession,
  WebhookEvent,
  PaymentResult,
} from "./provider";

// Lazy-load Stripe to avoid import errors when key is not set
async function getStripe() {
  const Stripe = (await import("stripe")).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-06-24.dahlia",
  });
}

export class StripeAdapter implements PaymentProvider {
  readonly name = "stripe";

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
    const stripe = await getStripe();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: params.customerEmail,
      line_items: [
        {
          price_data: {
            currency: params.currency,
            product_data: {
              name: `Order ${params.orderNumber}`,
              metadata: {
                orderId: params.orderId,
              },
            },
            unit_amount: params.amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: params.cancelUrl,
      metadata: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        ...params.metadata,
      },
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  async verifyWebhook(
    payload: string | Buffer,
    signature: string | null
  ): Promise<WebhookEvent | null> {
    if (!signature) return null;

    const stripe = await getStripe();
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return null;
    }

    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret
      );

      return {
        id: event.id,
        type: event.type,
        data: event.data as unknown as { object: Record<string, unknown> },
      };
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return null;
    }
  }

  async getPaymentStatus(sessionId: string): Promise<PaymentResult> {
    const stripe = await getStripe();

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      return {
        success: session.payment_status === "paid",
        sessionId: session.id,
        paymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : undefined,
      };
    } catch {
      return { success: false, error: "Session not found" };
    }
  }
}
