import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const orders = await db.order.findMany({
      include: {
        items: { include: { product: true } },
        payment: true,
        workOrder: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate financial summary
    const summary = {
      totalRevenue: 0,
      pendingPayments: 0,
      depositPaid: 0,
      settled: 0,
      byStatus: {} as Record<string, { count: number; total: number }>,
    };

    for (const order of orders) {
      const total = parseFloat(order.total.toString());
      summary.totalRevenue += total;

      if (!summary.byStatus[order.status]) {
        summary.byStatus[order.status] = { count: 0, total: 0 };
      }
      summary.byStatus[order.status].count++;
      summary.byStatus[order.status].total += total;

      if (order.payment?.status === "PENDING") {
        summary.pendingPayments += total;
      } else if (order.status === "DEPOSIT_PAID") {
        summary.depositPaid += total;
      } else if (order.status === "PAID" || order.status === "COMPLETED") {
        summary.settled += total;
      }
    }

    return NextResponse.json({ orders, summary });
  } catch (error) {
    console.error("Finance fetch error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch financial data" } },
      { status: 500 }
    );
  }
}
