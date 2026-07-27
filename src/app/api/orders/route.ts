import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orderSchema } from "@/lib/validation";
import { getPaymentProvider } from "@/lib/payments";
import { DEPOSIT_RATE, IVA_RATE } from "@/lib/payments/config";

function generateOrderNumber(): string {
  const date = new Date();
  const prefix = "JA";
  const timestamp = date.getFullYear().toString().slice(-2) +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = orderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const { customerName, customerEmail, customerPhone, customerAddress, paymentMethod, items, scheduledDate, scheduledTime, notes } = parsed.data;

    // Fetch products and calculate totals
    const productIds = items.map((item) => item.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
    });

    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new Error(`Product not found: ${item.productId}`);

      const unitPrice = parseFloat(product.price.toString());
      const total = unitPrice * item.quantity;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        total,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * IVA_RATE;
    const total = subtotal + tax;

    // Deposit/full payment logic using centralized constant
    const isDeposit = paymentMethod === "DEPOSIT";
    const depositRate = isDeposit ? DEPOSIT_RATE : 0;
    const depositAmount = isDeposit ? total * DEPOSIT_RATE : undefined;
    const amountPaid = 0; // Nothing paid yet — only after webhook
    const amountDue = isDeposit ? (depositAmount || 0) : total;
    const balanceDue = isDeposit ? total - (depositAmount || 0) : undefined;

    // Create order
    const order = await db.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        status: "PENDING",
        paymentMethod: paymentMethod as "FULL" | "DEPOSIT",
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        subtotal,
        tax,
        total,
        depositRate,
        depositAmount,
        amountPaid,
        amountDue,
        balanceDue,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        scheduledTime,
        notes,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    // Create Stripe Checkout session via PaymentProvider
    const provider = await getPaymentProvider();
    const chargeAmount = amountDue; // Full = total, Deposit = depositAmount

    const session = await provider.createCheckoutSession({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Math.round(chargeAmount), // CLP: no decimals
      currency: "clp",
      customerEmail,
      customerName,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checkout`,
      metadata: {
        paymentMethod,
        depositRate: String(depositRate),
        amountDue: String(amountDue),
      },
    });

    // Store payment record (status stays PENDING until webhook confirms)
    await db.payment.create({
      data: {
        orderId: order.id,
        provider: provider.name,
        sessionId: session.sessionId,
        amount: chargeAmount,
        currency: "CLP",
        status: "PENDING",
      },
    });

    return NextResponse.json({
      order,
      checkoutUrl: session.url,
    }, { status: 201 });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create order" } },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get("orderNumber");
    const email = searchParams.get("email");

    if (!orderNumber && !email) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Order number or email required" } },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = {};
    if (orderNumber) where.orderNumber = orderNumber;
    if (email) where.customerEmail = email;

    const orders = await db.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        payment: true,
        workOrder: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Orders fetch error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch orders" } },
      { status: 500 }
    );
  }
}
