import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/crm/[email]
 * 360° customer view: quote history, orders, equipment, work orders, tickets.
 * Accessible to ADMIN and SUPPORT roles.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await params;
    const decodedEmail = decodeURIComponent(email);

    // Pull all related data in parallel
    const [orders, warranties, tickets] = await Promise.all([
      db.order.findMany({
        where: { customerEmail: decodedEmail },
        include: {
          items: { include: { product: true } },
          payment: true,
          workOrder: true,
        },
        orderBy: { createdAt: "desc" },
      }),

      db.warrantyInfo.findMany({
        where: { customerEmail: decodedEmail },
        include: { product: true, alerts: true },
        orderBy: { installDate: "desc" },
      }),

      db.ticket.findMany({
        where: {
          creator: { email: decodedEmail },
        },
        include: {
          creator: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Aggregate
    const totalSpent = orders.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0);
    const totalOutstanding = orders.reduce((sum, o) => {
      const due = parseFloat(o.amountDue.toString());
      const paid = parseFloat(o.amountPaid.toString());
      return sum + Math.max(0, due - paid);
    }, 0);

    const customer = {
      email: decodedEmail,
      name: orders[0]?.customerName || warranties[0]?.customerName || tickets[0]?.creator?.name || "",
      phone: orders[0]?.customerPhone || warranties[0]?.customerPhone || "",
      address: orders[0]?.customerAddress || "",
      totalSpent,
      totalOutstanding,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentMethod: o.paymentMethod,
        total: parseFloat(o.total.toString()),
        amountPaid: parseFloat(o.amountPaid.toString()),
        amountDue: parseFloat(o.amountDue.toString()),
        createdAt: o.createdAt,
        items: o.items.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
          total: parseFloat(i.total.toString()),
        })),
        workOrder: o.workOrder ? {
          id: o.workOrder.id,
          status: o.workOrder.status,
          scheduledDate: o.workOrder.scheduledDate,
          completedAt: o.workOrder.completedAt,
        } : null,
      })),
      equipment: warranties.map((w) => ({
        id: w.id,
        serialNumber: w.serialNumber,
        brand: w.brand,
        model: w.model,
        productName: w.product?.name || "",
        installDate: w.installDate,
        lastServiceAt: w.lastServiceAt,
        warrantyMonths: w.warrantyMonths,
        alerts: w.alerts.map((a) => ({
          alertType: a.alertType,
          status: a.status,
          scheduledFor: a.scheduledFor,
          sentAt: a.sentAt,
        })),
      })),
      tickets: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee?.name || null,
        dueAt: t.dueAt,
        createdAt: t.createdAt,
        latestMessage: t.messages[0]?.content || null,
      })),
    };

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("CRM customer fetch error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch customer" } },
      { status: 500 }
    );
  }
}
