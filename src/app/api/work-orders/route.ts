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

    // Technicians only see their own orders
    if (payload.role === "TECHNICIAN") {
      where.technicianId = payload.sub;
    }

    // TODO: Crew assignment does not yet consider technician geolocation/proximity
    // to job site — kanban assignment is manual only. Revisit in Phase 6 hardening
    // or as a fast-follow.

    const workOrders = await db.workOrder.findMany({
      where,
      include: {
        order: true,
        technician: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });

    // Group by status for Kanban
    const kanban = {
      CREATED: workOrders.filter((wo) => wo.status === "CREATED"),
      ASSIGNED: workOrders.filter((wo) => wo.status === "ASSIGNED"),
      EN_ROUTE: workOrders.filter((wo) => wo.status === "EN_ROUTE"),
      ON_SITE: workOrders.filter((wo) => wo.status === "ON_SITE"),
      IN_PROGRESS: workOrders.filter((wo) => wo.status === "IN_PROGRESS"),
      COMPLETED: workOrders.filter((wo) => wo.status === "COMPLETED"),
    };

    return NextResponse.json({ workOrders, kanban });
  } catch (error) {
    console.error("Work orders fetch error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch work orders" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, technicianId, scheduledDate, scheduledTime, address, notes } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Order ID required" } },
        { status: 400 }
      );
    }

    const workOrder = await db.workOrder.create({
      data: {
        orderId,
        status: "CREATED",
        technicianId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        scheduledTime,
        address,
        technicianNotes: notes,
      },
      include: {
        order: true,
        technician: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ workOrder }, { status: 201 });
  } catch (error) {
    console.error("Work order creation error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create work order" } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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

    const body = await request.json();
    const { id, status, technicianId, safetyChecklist, suppliesChecklist, signatureUrl, technicianNotes, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Work order ID required" } },
        { status: 400 }
      );
    }

    // RBAC: Technicians can only update their own work orders
    if (payload.role === "TECHNICIAN") {
      const existing = await db.workOrder.findUnique({ where: { id } });
      if (!existing || existing.technicianId !== payload.sub) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Work order not assigned to you" } },
          { status: 403 }
        );
      }
    }

    const workOrder = await db.workOrder.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(technicianId && { technicianId }),
        ...(safetyChecklist && { safetyChecklist }),
        ...(suppliesChecklist && { suppliesChecklist }),
        ...(signatureUrl && { signatureUrl }),
        ...(technicianNotes !== undefined && { technicianNotes }),
        ...updateData,
      },
      include: {
        order: true,
        technician: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ workOrder });
  } catch (error) {
    console.error("Work order update error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update work order" } },
      { status: 500 }
    );
  }
}
