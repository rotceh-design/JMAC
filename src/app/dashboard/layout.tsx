"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const roleNav: Record<string, { label: string; href: string }[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/dashboard/admin" },
    { label: "Users", href: "/dashboard/admin/users" },
    { label: "Reports", href: "/dashboard/admin/reports" },
  ],
  OPERATIONS: [
    { label: "Dashboard", href: "/dashboard/operations" },
    { label: "Work Orders", href: "/dashboard/operations/work-orders" },
    { label: "Scheduling", href: "/dashboard/operations/scheduling" },
  ],
  SUPPORT: [
    { label: "Dashboard", href: "/dashboard/support" },
    { label: "Tickets", href: "/dashboard/support/tickets" },
    { label: "Warranties", href: "/dashboard/support/warranties" },
  ],
  TECHNICIAN: [
    { label: "My Work", href: "/dashboard/technician" },
    { label: "Today's Route", href: "/dashboard/technician/route" },
  ],
};

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) throw new Error("Not authenticated");
        return r.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => router.push("/login"));
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const navItems = roleNav[user.role] || [];

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center border-b border-sidebar-border px-4">
            <Link href="/" className="font-semibold text-sidebar-foreground">
              Jhon Aire
            </Link>
            <span className="ml-2 text-xs bg-sidebar-accent text-sidebar-accent-foreground px-2 py-0.5 rounded">
              {user.role}
            </span>
          </div>

          <nav className="flex-1 space-y-1 p-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="font-medium text-sidebar-foreground">{user.name}</p>
                <p className="text-xs text-sidebar-foreground/60">{user.email}</p>
              </div>
              <ThemeToggle />
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 w-full rounded-md bg-destructive/10 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/20 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 hover:bg-accent"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold">Jhon Aire</span>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
