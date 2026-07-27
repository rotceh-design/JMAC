import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

function decodeToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const payload = decodeToken(token);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const dateFrom = searchParams.get("from");
    const dateTo = searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (statusFilter) where.status = statusFilter;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
    }

    const orders = await db.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        payment: true,
        workOrder: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Financial summary
    const summary = {
      totalRevenue: 0,
      pendingPayments: 0,
      depositPaid: 0,
      settled: 0,
      totalOutstanding: 0,
      byStatus: {} as Record<string, { count: number; total: number }>,
    };

    for (const order of orders) {
      const total = parseFloat(order.total.toString());
      const amountPaid = parseFloat(order.amountPaid.toString());
      const amountDue = parseFloat(order.amountDue.toString());
      const outstanding = Math.max(0, amountDue - amountPaid);

      summary.totalRevenue += total;
      summary.totalOutstanding += outstanding;

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
