"use client";

import * as React from "react";

interface WorkOrder {
  id: string;
  status: string;
  priority: number;
  address: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  technicianNotes: string | null;
  technician: { id: string; name: string } | null;
  order: {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    total: string;
  } | null;
}

const statusColumns = [
  { key: "CREATED", label: "New", color: "bg-blue-500" },
  { key: "ASSIGNED", label: "Assigned", color: "bg-yellow-500" },
  { key: "EN_ROUTE", label: "En Route", color: "bg-orange-500" },
  { key: "ON_SITE", label: "On Site", color: "bg-purple-500" },
  { key: "IN_PROGRESS", label: "In Progress", color: "bg-indigo-500" },
  { key: "COMPLETED", label: "Completed", color: "bg-green-500" },
];

export default function WorkOrdersPage() {
  const [kanban, setKanban] = React.useState<Record<string, WorkOrder[]>>({});
  const [loading, setLoading] = React.useState(true);
  const [draggedItem, setDraggedItem] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchWorkOrders();
  }, []);

  async function fetchWorkOrders() {
    try {
      const res = await fetch("/api/work-orders");
      const data = await res.json();
      setKanban(data.kanban || {});
    } catch {
      setKanban({});
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(workOrderId: string, newStatus: string) {
    try {
      await fetch("/api/work-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: workOrderId, status: newStatus }),
      });
      fetchWorkOrders();
    } catch {
      alert("Failed to update status");
    }
  }

  function handleDragStart(e: React.DragEvent, workOrderId: string) {
    setDraggedItem(workOrderId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, targetStatus: string) {
    e.preventDefault();
    if (draggedItem) {
      handleStatusChange(draggedItem, targetStatus);
      setDraggedItem(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work Orders</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work Orders</h1>
          <p className="text-muted-foreground">Drag and drop to update status</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusColumns.map((col) => (
          <div
            key={col.key}
            className="flex-shrink-0 w-72"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${col.color}`} />
              <h3 className="font-medium text-sm">{col.label}</h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {kanban[col.key]?.length || 0}
              </span>
            </div>

            <div className="space-y-2 min-h-[200px]">
              {(kanban[col.key] || []).map((wo) => (
                <div
                  key={wo.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, wo.id)}
                  className="rounded-lg border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      {wo.order?.orderNumber || "N/A"}
                    </span>
                    {wo.priority > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                        P{wo.priority}
                      </span>
                    )}
                  </div>

                  <p className="font-medium text-sm mb-1">
                    {wo.order?.customerName || "Unknown Customer"}
                  </p>

                  <p className="text-xs text-muted-foreground mb-2">
                    {wo.address || wo.order?.customerAddress || "No address"}
                  </p>

                  {wo.scheduledDate && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(wo.scheduledDate).toLocaleDateString()} {wo.scheduledTime}
                    </p>
                  )}

                  {wo.technician && (
                    <div className="mt-2 flex items-center gap-1">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                        {wo.technician.name.charAt(0)}
                      </div>
                      <span className="text-xs text-muted-foreground">{wo.technician.name}</span>
                    </div>
                  )}
                </div>
              ))}

              {(kanban[col.key] || []).length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
                  No orders
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
