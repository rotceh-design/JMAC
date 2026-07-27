/**
 * Payment provider factory.
 * Returns the configured provider based on PAYMENT_PROVIDER env var.
 * Default: "stripe"
 */
import type { PaymentProvider } from "./provider";

let _provider: PaymentProvider | null = null;

export async function getPaymentProvider(): Promise<PaymentProvider> {
  if (_provider) return _provider;

  const providerName = process.env.PAYMENT_PROVIDER || "stripe";

  switch (providerName) {
    case "stripe": {
      const { StripeAdapter } = await import("./stripe");
      _provider = new StripeAdapter();
      break;
    }
    // Future providers:
    // case "webpay": {
    //   const { WebpayAdapter } = await import("./webpay");
    //   _provider = new WebpayAdapter();
    //   break;
    // }
    // case "mercadopago": {
    //   const { MercadoPagoAdapter } = await import("./mercadopago");
    //   _provider = new MercadoPagoAdapter();
    //   break;
    // }
    default:
      throw new Error(`Unknown payment provider: ${providerName}`);
  }

  return _provider;
}

export type { PaymentProvider, CheckoutSession, WebhookEvent, PaymentResult } from "./provider";
