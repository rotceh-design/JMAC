import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/maintenance/check
 *
 * Scheduled endpoint that checks for due maintenance alerts and sends them.
 * Idempotent: uses MaintenanceAlert unique constraint on [warrantyId, alertType]
 * and status=PENDING to ensure each alert is sent exactly once.
 *
 * AUTH: Requires x-cron-secret header matching CRON_SECRET env var.
 * Configure your cron caller (Vercel Cron, GitHub Actions, curl) to send:
 *   Header: x-cron-secret: <your-CRON_SECRET-value>
 */
export async function POST(request: Request) {
  // ─── Cron secret check ──────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get("x-cron-secret");

  if (!cronSecret || providedSecret !== cronSecret) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid or missing cron secret" } },
      { status: 401 }
    );
  }

  try {
    const now = new Date();

    // Find all pending alerts whose scheduled time has arrived
    const dueAlerts = await db.maintenanceAlert.findMany({
      where: {
        status: "PENDING",
        scheduledFor: { lte: now },
      },
      include: {
        warranty: {
          include: { product: true },
        },
      },
      orderBy: { scheduledFor: "asc" },
      take: 50, // process in batches
    });

    const results = { sent: 0, failed: 0, skipped: 0 };

    for (const alert of dueAlerts) {
      const warranty = alert.warranty;
      const product = warranty.product;

      const alertLabel = alert.alertType === "SIX_MONTH"
        ? "6-month maintenance reminder"
        : "12-month maintenance reminder";

      const subject = `Maintenance Reminder: ${product.name} — ${alertLabel}`;

      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#111827;">Maintenance Reminder</h2>
          <p>Hello ${warranty.customerName},</p>
          <p>This is a friendly reminder that your <strong>${product.name}</strong> (${warranty.brand} ${warranty.model}) installed on ${new Date(warranty.installDate).toLocaleDateString()} is due for maintenance.</p>
          <p><strong>Serial Number:</strong> ${warranty.serialNumber}</p>
          <p><strong>Service:</strong> ${alertLabel}</p>
          ${warranty.lastServiceAt ? `<p><strong>Last Service:</strong> ${new Date(warranty.lastServiceAt).toLocaleDateString()}</p>` : ""}
          <p>Please contact us to schedule your maintenance appointment.</p>
          <p>Best regards,<br/>Jhon Aire — Climate Control Services</p>
        </div>
      `;

      try {
        await sendEmail({
          to: warranty.customerEmail,
          subject,
          html,
        });

        // Mark as sent — only after email succeeds
        await db.maintenanceAlert.update({
          where: { id: alert.id },
          data: { status: "SENT", sentAt: new Date() },
        });

        results.sent++;
      } catch (emailError) {
        console.error(`Failed to send alert ${alert.id}:`, emailError);
        await db.maintenanceAlert.update({
          where: { id: alert.id },
          data: { status: "FAILED" },
        });
        results.failed++;
      }
    }

    return NextResponse.json({
      checked: dueAlerts.length,
      sent: results.sent,
      failed: results.failed,
    });
  } catch (error) {
    console.error("Maintenance check error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Maintenance check failed" } },
      { status: 500 }
    );
  }
}
