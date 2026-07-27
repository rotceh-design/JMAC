import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticketId, content, authorId, isInternal } = body;

    if (!ticketId || !content) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Ticket ID and content required" } },
        { status: 400 }
      );
    }

    const message = await db.ticketMessage.create({
      data: {
        ticketId,
        content,
        authorId,
        isInternal: isInternal || false,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    // Update first response time if not set
    const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
    if (ticket && !ticket.firstResponseAt) {
      await db.ticket.update({
        where: { id: ticketId },
        data: { firstResponseAt: new Date() },
      });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Message creation error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create message" } },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get("ticketId");

    if (!ticketId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Ticket ID required" } },
        { status: 400 }
      );
    }

    const messages = await db.ticketMessage.findMany({
      where: { ticketId },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Messages fetch error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch messages" } },
      { status: 500 }
    );
  }
}
