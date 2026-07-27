"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

interface CustomerData {
  email: string;
  name: string;
  phone: string;
  address: string;
  totalSpent: number;
  totalOutstanding: number;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentMethod: string;
    total: number;
    amountPaid: number;
    amountDue: number;
    createdAt: string;
    items: Array<{ name: string; quantity: number; total: number }>;
    workOrder: { id: string; status: string; scheduledDate: string | null; completedAt: string | null } | null;
  }>;
  equipment: Array<{
    id: string;
    serialNumber: string;
    brand: string;
    model: string;
    productName: string;
    installDate: string;
    lastServiceAt: string | null;
    warrantyMonths: number;
    alerts: Array<{ alertType: string; status: string; scheduledFor: string; sentAt: string | null }>;
  }>;
  tickets: Array<{
    id: string;
    ticketNumber: string;
    subject: string;
    status: string;
    priority: string;
    assignee: string | null;
    dueAt: string | null;
    createdAt: string;
    latestMessage: string | null;
  }>;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  DEPOSIT_PAID: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  OPEN: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-green-100 text-green-700",
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const email = params.email as string;
  const [customer, setCustomer] = React.useState<CustomerData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (email) fetchCustomer();
  }, [email]);

  async function fetchCustomer() {
    try {
      const res = await fetch(`/api/crm/${encodeURIComponent(email)}`);
      const data = await res.json();
      setCustomer(data.customer);
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Loading customer data...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Customer not found.</p>
        <button onClick={() => router.back()} className="text-sm text-primary hover:underline">← Back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => router.back()} className="text-sm text-primary hover:underline mb-2">← Back to customers</button>
        <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
        <p className="text-muted-foreground">{customer.email}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Spent</p>
          <p className="text-2xl font-bold">${customer.totalSpent.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className={`text-2xl font-bold ${customer.totalOutstanding > 0 ? "text-yellow-600" : "text-green-600"}`}>
            ${customer.totalOutstanding.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Orders</p>
          <p className="text-2xl font-bold">{customer.orders.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Equipment</p>
          <p className="text-2xl font-bold">{customer.equipment.length}</p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold mb-2">Contact</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Phone:</span> {customer.phone || "N/A"}</div>
          <div><span className="text-muted-foreground">Address:</span> {customer.address || "N/A"}</div>
        </div>
      </div>

      {/* Orders */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Order History ({customer.orders.length})</h2>
        </div>
        <div className="divide-y">
          {customer.orders.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No orders.</p>
          ) : (
            customer.orders.map((order) => (
              <div key={order.id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs">{order.orderNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColors[order.status] || ""}`}>{order.status}</span>
                </div>
                <p className="text-sm">{order.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}</p>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">${order.total.toLocaleString()}</span>
                  <span className="text-muted-foreground">Paid: ${order.amountPaid.toLocaleString()} | Due: ${order.amountDue.toLocaleString()}</span>
                </div>
                {order.workOrder && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Work Order: {order.workOrder.status} {order.workOrder.completedAt ? `(completed ${new Date(order.workOrder.completedAt).toLocaleDateString()})` : ""}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Equipment */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Installed Equipment ({customer.equipment.length})</h2>
        </div>
        <div className="divide-y">
          {customer.equipment.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No equipment registered.</p>
          ) : (
            customer.equipment.map((eq) => (
              <div key={eq.id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs">{eq.serialNumber}</span>
                  <span className="text-xs text-muted-foreground">{eq.warrantyMonths}mo warranty</span>
                </div>
                <p className="text-sm font-medium">{eq.productName || `${eq.brand} ${eq.model}`}</p>
                <p className="text-xs text-muted-foreground">
                  Installed: {new Date(eq.installDate).toLocaleDateString()}
                  {eq.lastServiceAt ? ` | Last service: ${new Date(eq.lastServiceAt).toLocaleDateString()}` : ""}
                </p>
                {eq.alerts.length > 0 && (
                  <div className="flex gap-2 mt-1">
                    {eq.alerts.map((a, i) => (
                      <span key={i} className={`text-xs px-1.5 py-0.5 rounded ${a.status === "SENT" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {a.alertType.replace("_", " ")}: {a.status}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tickets */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Support Tickets ({customer.tickets.length})</h2>
        </div>
        <div className="divide-y">
          {customer.tickets.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No tickets.</p>
          ) : (
            customer.tickets.map((ticket) => (
              <div key={ticket.id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs">{ticket.ticketNumber}</span>
                  <div className="flex gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${statusColors[ticket.status] || ""}`}>{ticket.status}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted">{ticket.priority}</span>
                  </div>
                </div>
                <p className="text-sm font-medium">{ticket.subject}</p>
                {ticket.assignee && <p className="text-xs text-muted-foreground">Assigned: {ticket.assignee}</p>}
                {ticket.dueAt && <p className="text-xs text-muted-foreground">Due: {new Date(ticket.dueAt).toLocaleDateString()}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
