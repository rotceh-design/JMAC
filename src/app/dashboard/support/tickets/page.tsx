"use client";

import * as React from "react";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  dueAt: string | null;
  creator: { name: string; email: string };
  assignee: { name: string } | null;
  messages: Array<{ content: string; createdAt: string }>;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  WAITING_CUSTOMER: "bg-yellow-100 text-yellow-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-700",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export default function TicketsPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState("all");

  React.useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    try {
      const res = await fetch("/api/tickets");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter === "all"
    ? tickets
    : tickets.filter((t) => t.status === filter);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
        <p className="text-muted-foreground">Manage customer support requests</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["all", "OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              filter === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            No tickets found.
          </div>
        ) : (
          filtered.map((ticket) => (
            <div
              key={ticket.id}
              className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {ticket.ticketNumber}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColors[ticket.status] || ""}`}>
                    {ticket.status.replace("_", " ")}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[ticket.priority] || ""}`}>
                    {ticket.priority}
                  </span>
                </div>
                {ticket.dueAt && (
                  <span className="text-xs text-muted-foreground">
                    Due: {new Date(ticket.dueAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <h3 className="font-medium mb-1">{ticket.subject}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                From: {ticket.creator.name}
              </p>

              {ticket.messages.length > 0 && (
                <p className="text-sm text-muted-foreground truncate">
                  Latest: {ticket.messages[0].content}
                </p>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                <span>Assigned: {ticket.assignee?.name || "Unassigned"}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
