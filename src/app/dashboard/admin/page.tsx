export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">System overview and management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Orders", value: "—", sub: "Phase 2" },
          { label: "Active Users", value: "—", sub: "Phase 2" },
          { label: "Revenue", value: "—", sub: "Phase 2" },
          { label: "Open Tickets", value: "—", sub: "Phase 4" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/dashboard/admin/users" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Manage Users
          </a>
          <a href="/dashboard/admin/reports" className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            View Reports
          </a>
        </div>
      </div>
    </div>
  );
}
