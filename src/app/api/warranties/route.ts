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
    const { searchParams } = new URL(request.url);
    const serialNumber = searchParams.get("serialNumber");
    const email = searchParams.get("email");

    const where: Record<string, unknown> = {};
    if (serialNumber) where.serialNumber = serialNumber;
    if (email) where.customerEmail = email;

    const warranties = await db.warrantyInfo.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ warranties });
  } catch (error) {
    console.error("Warranty fetch error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch warranties" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
    const {
      productId, serialNumber, brand, model, installDate,
      customerName, customerEmail, customerPhone,
      warrantyMonths, notes, workOrderId,
    } = body;

    if (!serialNumber || !customerEmail) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Serial number and customer email required" } },
        { status: 400 }
      );
    }

    const warranty = await db.warrantyInfo.create({
      data: {
        productId,
        serialNumber,
        brand,
        model,
        installDate: new Date(installDate),
        customerName,
        customerEmail,
        customerPhone,
        warrantyMonths: warrantyMonths || 12,
        notes,
        workOrderId,
      },
      include: { product: true },
    });

    // Auto-schedule maintenance alerts for 6 and 12 months
    const install = new Date(installDate);
    const sixMonths = new Date(install);
    sixMonths.setMonth(sixMonths.getMonth() + 6);

    const twelveMonths = new Date(install);
    twelveMonths.setMonth(twelveMonths.getMonth() + 12);

    // Use createMany with skipDuplicates for idempotency
    await db.maintenanceAlert.createMany({
      data: [
        { warrantyId: warranty.id, alertType: "SIX_MONTH", scheduledFor: sixMonths },
        { warrantyId: warranty.id, alertType: "TWELVE_MONTH", scheduledFor: twelveMonths },
      ],
      skipDuplicates: true, // idempotent: unique constraint on [warrantyId, alertType]
    });

    return NextResponse.json({ warranty }, { status: 201 });
  } catch (error) {
    console.error("Warranty creation error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create warranty" } },
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
    const { id, lastServiceAt, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Warranty ID required" } },
        { status: 400 }
      );
    }

    const warranty = await db.warrantyInfo.update({
      where: { id },
      data: {
        ...updateData,
        ...(lastServiceAt && { lastServiceAt: new Date(lastServiceAt) }),
      },
      include: { product: true },
    });

    return NextResponse.json({ warranty });
  } catch (error) {
    console.error("Warranty update error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update warranty" } },
      { status: 500 }
    );
  }
}
