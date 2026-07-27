export default function SupportDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support Dashboard</h1>
        <p className="text-muted-foreground">Equipment registry and support tickets</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Open Tickets", value: "—" },
          { label: "In Progress", value: "—" },
          { label: "Resolved This Week", value: "—" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/dashboard/support/tickets" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            View Tickets
          </a>
          <a href="/dashboard/support/warranties" className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            Equipment Registry
          </a>
        </div>
      </div>
    </div>
  );
}
