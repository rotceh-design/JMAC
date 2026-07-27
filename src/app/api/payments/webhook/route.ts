import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { sendEmail } from "@/lib/email";
import { generateReceiptHtml } from "@/lib/receipt";

/**
 * Stripe webhook handler.
 * CRITICAL: Status is ONLY flipped to "paid" after signature verification.
 * Receipt is ONLY sent after verified webhook — never from client.
 * IDEMPOTENT: Duplicate event.id is detected and short-circuited.
 */
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    const provider = await getPaymentProvider();
    const event = await provider.verifyWebhook(body, signature);

    if (!event) {
      return NextResponse.json(
        { error: { code: "INVALID_SIGNATURE", message: "Webhook signature verification failed" } },
        { status: 400 }
      );
    }

    // ─── Idempotency guard ──────────────────────────────────────
    // Stripe retries delivery on non-2xx or timeout. If the same
    // event.id arrives twice, skip processing entirely.
    const existing = await db.processedEvent.findUnique({
      where: { eventId: event.id as string },
    });

    if (existing) {
      console.log(`Duplicate webhook event ${event.id}, skipping`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Record event BEFORE processing — if processing fails, we
    // don't want to block retries (Stripe will re-deliver). But
    // for success, this prevents double-processing.
    await db.processedEvent.create({
      data: {
        eventId: event.id as string,
        eventType: event.type as string,
      },
    });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const sessionId = session.id as string;

        // Find payment record by session ID
        const payment = await db.payment.findFirst({
          where: { sessionId },
          include: { order: { include: { items: { include: { product: true } } } } },
        });

        if (!payment) {
          console.error(`No payment found for session ${sessionId}`);
          break;
        }

        const order = payment.order;
        const isDeposit = order.paymentMethod === "DEPOSIT";
        const paymentAmount = parseFloat(payment.amount.toString());

        // Update payment status — ONLY after verified webhook
        await db.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCEEDED",
            paidAt: new Date(),
            paymentIntentId: session.payment_intent as string | undefined,
          },
        });

        // Update order: amountPaid and status — ONLY after verified webhook
        const currentAmountPaid = parseFloat(order.amountPaid.toString());
        const newAmountPaid = currentAmountPaid + paymentAmount;
        const orderTotal = parseFloat(order.total.toString());
        const remaining = orderTotal - newAmountPaid;

        let newStatus: string;
        if (remaining <= 0) {
          newStatus = "PAID"; // Full payment or final deposit payment
        } else if (isDeposit && newAmountPaid > 0) {
          newStatus = "DEPOSIT_PAID";
        } else {
          newStatus = "PAID";
        }

        await db.order.update({
          where: { id: order.id },
          data: {
            status: newStatus as "PENDING" | "DEPOSIT_PAID" | "PAID",
            amountPaid: newAmountPaid,
            amountDue: remaining > 0 ? remaining : 0,
          },
        });

        // Send receipt email — ONLY after verified webhook
        try {
          const receiptHtml = generateReceiptHtml({
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            items: order.items.map((item) => ({
              name: item.product.name,
              quantity: item.quantity,
              unitPrice: parseFloat(item.unitPrice.toString()),
              total: parseFloat(item.total.toString()),
            })),
            subtotal: parseFloat(order.subtotal.toString()),
            tax: parseFloat(order.tax.toString()),
            total: orderTotal,
            amountPaid: newAmountPaid,
            amountDue: remaining > 0 ? remaining : 0,
            paymentMethod: order.paymentMethod as "FULL" | "DEPOSIT",
            paidAt: new Date(),
          });

          await sendEmail({
            to: order.customerEmail,
            subject: `Payment Receipt - Order ${order.orderNumber}`,
            html: receiptHtml,
          });

          console.log(`Receipt sent for order ${order.orderNumber}`);
        } catch (emailError) {
          // Don't fail the webhook for email errors
          console.error(`Failed to send receipt for order ${order.orderNumber}:`, emailError);
        }

        console.log(`Payment confirmed for order ${order.orderNumber} (${newStatus})`);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id as string;

        const payment = await db.payment.findFirst({
          where: { paymentIntentId },
        });

        if (payment) {
          await db.payment.update({
            where: { id: payment.id },
            data: { status: "FAILED" },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: { code: "WEBHOOK_ERROR", message: "Webhook processing failed" } },
      { status: 500 }
    );
  }
}
