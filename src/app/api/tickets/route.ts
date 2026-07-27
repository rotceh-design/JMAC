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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const payload = decodeToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "Invalid token" } },
        { status: 401 }
      );
    }

    const where: Record<string, unknown> = {};

    // Support agents see all, others see only their assigned
    if (payload.role === "SUPPORT") {
      // See all tickets
    } else {
      where.assigneeId = payload.sub;
    }

    const tickets = await db.ticket.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Tickets fetch error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch tickets" } },
      { status: 500 }
    );
  }
}

/**
 * Atomic ticket number generation using an upserted counter row.
 * The upsert + increment is atomic at the DB level, so concurrent
 * requests each get a unique number without race conditions.
 */
async function generateTicketNumber(): Promise<string> {
  const counter = await db.ticketCounter.upsert({
    where: { prefix: "TKT" },
    update: { nextValue: { increment: 1 } },
    create: { prefix: "TKT", nextValue: 1 },
  });

  // counter.nextValue is the value AFTER increment, so the first
  // ticket gets TKT-00001, second gets TKT-00002, etc.
  return `TKT-${String(counter.nextValue).padStart(5, "0")}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subject, description, priority, assigneeId, warrantyId } = body;

    if (!subject || !description) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Subject and description required" } },
        { status: 400 }
      );
    }

    const ticketNumber = await generateTicketNumber();

    // Set SLA due date based on priority
    const slaHours: Record<string, number> = {
      LOW: 72,
      MEDIUM: 24,
      HIGH: 8,
      URGENT: 4,
    };
    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + (slaHours[priority] || 24));

    const ticket = await db.ticket.create({
      data: {
        ticketNumber,
        subject,
        description,
        priority: priority || "MEDIUM",
        creatorId: body.creatorId,
        assigneeId,
        warrantyId,
        dueAt,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error("Ticket creation error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create ticket" } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, assigneeId, priority } = body;

    if (!id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Ticket ID required" } },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (priority) updateData.priority = priority;

    if (status === "RESOLVED") {
      updateData.resolvedAt = new Date();
    }

    const ticket = await db.ticket.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Ticket update error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update ticket" } },
      { status: 500 }
    );
  }
}
