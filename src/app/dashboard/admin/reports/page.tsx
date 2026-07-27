"use client";

import * as React from "react";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  total: string;
  paymentMethod: string;
  createdAt: string;
  payment: { status: string } | null;
}

interface Summary {
  totalRevenue: number;
  pendingPayments: number;
  depositPaid: number;
  settled: number;
  byStatus: Record<string, { count: number; total: number }>;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  DEPOSIT_PAID: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  SCHEDULED: "bg-purple-100 text-purple-700",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  REFUNDED: "bg-gray-100 text-gray-700",
};

export default function AdminReportsPage() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/reports/finance");
      const data = await res.json();
      setOrders(data.orders || []);
      setSummary(data.summary);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function exportExcel(type: string) {
    try {
      const res = await fetch(`/api/reports/export?type=${type}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-report.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">Sales, performance, and financial data</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
            <p className="mt-2 text-3xl font-bold">${summary.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
            <p className="mt-2 text-3xl font-bold text-yellow-600">
              ${summary.pendingPayments.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Deposit Paid</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              ${summary.depositPaid.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Settled</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              ${summary.settled.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => exportExcel("sales")}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Export Sales Report
        </button>
        <button
          onClick={() => exportExcel("technicians")}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Export Technician Performance
        </button>
      </div>

      {/* Orders Table */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">All Orders</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Order #</th>
                <th className="p-3 text-left font-medium">Customer</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Payment</th>
                <th className="p-3 text-right font-medium">Total</th>
                <th className="p-3 text-right font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-accent/50">
                    <td className="p-3 font-mono text-xs">{order.orderNumber}</td>
                    <td className="p-3">{order.customerName}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded ${statusColors[order.status] || ""}`}>
                        {order.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-3">
                      {order.paymentMethod === "FULL" ? "Full" : "Deposit"}
                    </td>
                    <td className="p-3 text-right font-medium">
                      ${parseFloat(order.total).toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
