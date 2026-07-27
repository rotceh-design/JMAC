import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import ExcelJS from "exceljs";

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
    // ─── Admin-only RBAC ──────────────────────────────────────
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
    const type = searchParams.get("type") || "sales";

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Jhon Aire";
    workbook.created = new Date();

    if (type === "sales") {
      // ─── Monthly Sales Report ─────────────────────────────
      const worksheet = workbook.addWorksheet("Monthly Sales");

      worksheet.columns = [
        { header: "Month", key: "month", width: 15 },
        { header: "Orders", key: "count", width: 10 },
        { header: "Revenue", key: "revenue", width: 18 },
        { header: "Deposits", key: "deposits", width: 18 },
        { header: "Avg Order", key: "avg", width: 15 },
      ];

      const orders = await db.order.findMany({ orderBy: { createdAt: "asc" } });

      // Group by month
      const monthly = new Map<string, { count: number; revenue: number; deposits: number }>();
      for (const order of orders) {
        const key = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, "0")}`;
        const total = parseFloat(order.total.toString());
        const existing = monthly.get(key) || { count: 0, revenue: 0, deposits: 0 };
        existing.count++;
        existing.revenue += total;
        if (order.status === "DEPOSIT_PAID") existing.deposits += total;
        monthly.set(key, existing);
      }

      for (const [month, data] of monthly) {
        worksheet.addRow({
          month,
          count: data.count,
          revenue: data.revenue,
          deposits: data.deposits,
          avg: data.count > 0 ? Math.round(data.revenue / data.count) : 0,
        });
      }

      worksheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };
      worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };

    } else if (type === "technicians") {
      // ─── Technician Performance ────────────────────────────
      const worksheet = workbook.addWorksheet("Technician Performance");

      worksheet.columns = [
        { header: "Technician", key: "name", width: 25 },
        { header: "Email", key: "email", width: 30 },
        { header: "Completed", key: "completed", width: 12 },
        { header: "In Progress", key: "inProgress", width: 12 },
        { header: "Total", key: "total", width: 10 },
        { header: "Avg Hours", key: "avgHours", width: 12 },
      ];

      const technicians = await db.user.findMany({
        where: { role: "TECHNICIAN" },
        include: {
          workOrders: {
            select: { status: true, startedAt: true, completedAt: true },
          },
        },
      });

      for (const tech of technicians) {
        const completed = tech.workOrders.filter((wo) => wo.status === "COMPLETED");
        const inProgress = tech.workOrders.filter((wo) => wo.status === "IN_PROGRESS");

        // Average completion time
        const completionTimes = completed
          .filter((wo) => wo.startedAt && wo.completedAt)
          .map((wo) => {
            const start = new Date(wo.startedAt!).getTime();
            const end = new Date(wo.completedAt!).getTime();
            return (end - start) / (1000 * 60 * 60); // hours
          });

        const avgHours = completionTimes.length > 0
          ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length * 10) / 10
          : 0;

        worksheet.addRow({
          name: tech.name,
          email: tech.email,
          completed: completed.length,
          inProgress: inProgress.length,
          total: tech.workOrders.length,
          avgHours,
        });
      }

      worksheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };
      worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF70AD47" } };

    } else if (type === "retention") {
      // ─── Maintenance Retention Rate ────────────────────────
      const worksheet = workbook.addWorksheet("Maintenance Retention");

      worksheet.columns = [
        { header: "Metric", key: "metric", width: 35 },
        { header: "Value", key: "value", width: 20 },
      ];

      const [totalAlerts, sentAlerts, warrantiesWithService] = await Promise.all([
        db.maintenanceAlert.count(),
        db.maintenanceAlert.count({ where: { status: "SENT" } }),
        db.warrantyInfo.count({ where: { lastServiceAt: { not: null } } }),
      ]);

      const totalWarranties = await db.warrantyInfo.count();
      const retentionRate = totalAlerts > 0 ? Math.round((sentAlerts / totalAlerts) * 100) : 0;
      const serviceRate = totalWarranties > 0 ? Math.round((warrantiesWithService / totalWarranties) * 100) : 0;

      worksheet.addRow({ metric: "Total Scheduled Alerts", value: totalAlerts });
      worksheet.addRow({ metric: "Alerts Sent", value: sentAlerts });
      worksheet.addRow({ metric: "Alert Delivery Rate", value: `${retentionRate}%` });
      worksheet.addRow({ metric: "Total Warranties", value: totalWarranties });
      worksheet.addRow({ metric: "Warranties with Follow-up Service", value: warrantiesWithService });
      worksheet.addRow({ metric: "Service Retention Rate", value: `${serviceRate}%` });

      worksheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };
      worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFED7D31" } };
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${type}-report.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Excel export error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to generate report" } },
      { status: 500 }
    );
  }
}
