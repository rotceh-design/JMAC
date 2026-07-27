import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Date parameter required" } },
        { status: 400 }
      );
    }

    const date = new Date(dateStr);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get existing slots for the date
    const existingSlots = await db.timeSlot.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Generate available slots (9:00 - 18:00, 1-hour intervals)
    const allSlots = [];
    for (let hour = 9; hour < 18; hour++) {
      const startTime = `${String(hour).padStart(2, "0")}:00`;
      const endTime = `${String(hour + 1).padStart(2, "0")}:00`;

      const existing = existingSlots.find((s) => s.startTime === startTime);
      allSlots.push({
        startTime,
        endTime,
        isAvailable: existing ? existing.isAvailable : true,
      });
    }

    return NextResponse.json({ date: dateStr, slots: allSlots });
  } catch (error) {
    console.error("Scheduling fetch error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch slots" } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, startTime, endTime } = body;

    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Date, startTime, and endTime required" } },
        { status: 400 }
      );
    }

    const slotDate = new Date(date);

    // Check if slot exists and is available
    const existing = await db.timeSlot.findUnique({
      where: {
        date_startTime: {
          date: slotDate,
          startTime,
        },
      },
    });

    if (existing && !existing.isAvailable) {
      return NextResponse.json(
        { error: { code: "SLOT_UNAVAILABLE", message: "Time slot is no longer available" } },
        { status: 409 }
      );
    }

    // Create or update slot
    const slot = await db.timeSlot.upsert({
      where: {
        date_startTime: {
          date: slotDate,
          startTime,
        },
      },
      update: { isAvailable: false },
      create: {
        date: slotDate,
        startTime,
        endTime,
        isAvailable: false,
      },
    });

    return NextResponse.json({ slot });
  } catch (error) {
    console.error("Scheduling booking error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to book slot" } },
      { status: 500 }
    );
  }
}
