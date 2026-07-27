/**
 * Generic PaymentProvider interface.
 * Swap providers (Stripe → Webpay → MercadoPago) by creating a new adapter
 * that implements this interface. No business logic changes needed outside
 * the adapter and the payment route.
 */

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface PaymentResult {
  success: boolean;
  sessionId?: string;
  paymentIntentId?: string;
  error?: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

export interface PaymentProvider {
  /** Human-readable provider name */
  readonly name: string;

  /** Create a hosted checkout session */
  createCheckoutSession(params: {
    orderId: string;
    orderNumber: string;
    amount: number; // in smallest currency unit (cents for CLP: pesos)
    currency: string;
    customerEmail: string;
    customerName: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<CheckoutSession>;

  /** Verify and parse a webhook signature, return typed event */
  verifyWebhook(
    payload: string | Buffer,
    signature: string | null
  ): Promise<WebhookEvent | null>;

  /** Retrieve payment status by session ID */
  getPaymentStatus(sessionId: string): Promise<PaymentResult>;
}
