import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import ExcelJS from "exceljs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "sales";

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Jhon Aire";
    workbook.created = new Date();

    if (type === "sales") {
      const worksheet = workbook.addWorksheet("Sales Report");

      worksheet.columns = [
        { header: "Order #", key: "orderNumber", width: 20 },
        { header: "Customer", key: "customerName", width: 25 },
        { header: "Email", key: "customerEmail", width: 30 },
        { header: "Status", key: "status", width: 15 },
        { header: "Subtotal", key: "subtotal", width: 15 },
        { header: "Tax", key: "tax", width: 15 },
        { header: "Total", key: "total", width: 15 },
        { header: "Date", key: "createdAt", width: 20 },
      ];

      const orders = await db.order.findMany({
        orderBy: { createdAt: "desc" },
      });

      for (const order of orders) {
        worksheet.addRow({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          status: order.status,
          subtotal: parseFloat(order.subtotal.toString()),
          tax: parseFloat(order.tax.toString()),
          total: parseFloat(order.total.toString()),
          createdAt: order.createdAt.toLocaleDateString(),
        });
      }

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      worksheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };
    } else if (type === "technicians") {
      const worksheet = workbook.addWorksheet("Technician Performance");

      worksheet.columns = [
        { header: "Technician", key: "name", width: 25 },
        { header: "Email", key: "email", width: 30 },
        { header: "Completed Jobs", key: "completed", width: 15 },
        { header: "In Progress", key: "inProgress", width: 15 },
        { header: "Total Assigned", key: "total", width: 15 },
      ];

      const technicians = await db.user.findMany({
        where: { role: "TECHNICIAN" },
        include: {
          workOrders: {
            select: { status: true },
          },
        },
      });

      for (const tech of technicians) {
        const completed = tech.workOrders.filter((wo) => wo.status === "COMPLETED").length;
        const inProgress = tech.workOrders.filter((wo) => wo.status === "IN_PROGRESS").length;

        worksheet.addRow({
          name: tech.name,
          email: tech.email,
          completed,
          inProgress,
          total: tech.workOrders.length,
        });
      }

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF70AD47" },
      };
      worksheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };
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
