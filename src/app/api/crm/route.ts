import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Get all unique customers from orders
    const orders = await db.order.findMany({
      select: {
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        customerAddress: true,
        createdAt: true,
        total: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by customer email
    const customerMap = new Map<string, {
      name: string;
      email: string;
      phone: string;
      address: string;
      orders: Array<{ total: string; status: string; createdAt: Date }>;
      totalSpent: number;
      orderCount: number;
      lastOrder: Date;
    }>();

    for (const order of orders) {
      const existing = customerMap.get(order.customerEmail);
      if (existing) {
        existing.orders.push({ total: order.total.toString(), status: order.status, createdAt: order.createdAt });
        existing.totalSpent += parseFloat(order.total.toString());
        existing.orderCount++;
        if (order.createdAt > existing.lastOrder) existing.lastOrder = order.createdAt;
      } else {
        customerMap.set(order.customerEmail, {
          name: order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone,
          address: order.customerAddress,
          orders: [{ total: order.total.toString(), status: order.status, createdAt: order.createdAt }],
          totalSpent: parseFloat(order.total.toString()),
          orderCount: 1,
          lastOrder: order.createdAt,
        });
      }
    }

    const customers = Array.from(customerMap.values()).sort(
      (a, b) => b.totalSpent - a.totalSpent
    );

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("CRM fetch error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch customers" } },
      { status: 500 }
    );
  }
}
