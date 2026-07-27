import { describe, it, expect } from "vitest";

// ─── RBAC: Financial access ───────────────────────────────────

interface Token {
  sub: string;
  role: string;
}

function canAccessFinance(token: Token | null): boolean {
  if (!token) return false;
  return token.role === "ADMIN";
}

function canExportReports(token: Token | null): boolean {
  if (!token) return false;
  return token.role === "ADMIN";
}

function canViewCRM(token: Token | null): boolean {
  if (!token) return false;
  return ["ADMIN", "SUPPORT"].includes(token.role);
}

function canEditCRM(token: Token | null): boolean {
  if (!token) return false;
  return token.role === "ADMIN";
}

describe("RBAC - Financial & CRM Access", () => {
  const admin: Token = { sub: "a1", role: "ADMIN" };
  const support: Token = { sub: "s1", role: "SUPPORT" };
  const ops: Token = { sub: "o1", role: "OPERATIONS" };
  const tech: Token = { sub: "t1", role: "TECHNICIAN" };

  describe("Finance panel access", () => {
    it("ADMIN can access finance", () => expect(canAccessFinance(admin)).toBe(true));
    it("SUPPORT cannot access finance", () => expect(canAccessFinance(support)).toBe(false));
    it("OPERATIONS cannot access finance", () => expect(canAccessFinance(ops)).toBe(false));
    it("TECHNICIAN cannot access finance", () => expect(canAccessFinance(tech)).toBe(false));
    it("null token cannot access finance", () => expect(canAccessFinance(null)).toBe(false));
  });

  describe("Report export access", () => {
    it("ADMIN can export reports", () => expect(canExportReports(admin)).toBe(true));
    it("SUPPORT cannot export reports", () => expect(canExportReports(support)).toBe(false));
    it("OPERATIONS cannot export reports", () => expect(canExportReports(ops)).toBe(false));
    it("TECHNICIAN cannot export reports", () => expect(canExportReports(tech)).toBe(false));
  });

  describe("CRM view access", () => {
    it("ADMIN can view CRM", () => expect(canViewCRM(admin)).toBe(true));
    it("SUPPORT can view CRM", () => expect(canViewCRM(support)).toBe(true));
    it("OPERATIONS cannot view CRM", () => expect(canViewCRM(ops)).toBe(false));
    it("TECHNICIAN cannot view CRM", () => expect(canViewCRM(tech)).toBe(false));
  });

  describe("CRM edit access", () => {
    it("ADMIN can edit CRM", () => expect(canEditCRM(admin)).toBe(true));
    it("SUPPORT cannot edit CRM", () => expect(canEditCRM(support)).toBe(false));
  });
});

// ─── Outstanding balance calculation ──────────────────────────

interface OrderSummary {
  total: number;
  amountPaid: number;
  amountDue: number;
  status: string;
}

function calculateOutstanding(orders: OrderSummary[]): number {
  return orders.reduce((sum, o) => {
    if (o.status === "PAID" || o.status === "COMPLETED" || o.status === "CANCELLED") return sum;
    return sum + Math.max(0, o.amountDue - o.amountPaid);
  }, 0);
}

describe("Financial - Outstanding Balance", () => {
  it("sums unpaid amount across non-settled orders", () => {
    const orders: OrderSummary[] = [
      { total: 500000, amountPaid: 250000, amountDue: 250000, status: "DEPOSIT_PAID" },
      { total: 300000, amountPaid: 0, amountDue: 300000, status: "PENDING" },
      { total: 400000, amountPaid: 400000, amountDue: 0, status: "PAID" },
    ];
    // DEPOSIT_PAID: 250k - 250k = 0; PENDING: 300k - 0 = 300k; PAID excluded
    expect(calculateOutstanding(orders)).toBe(300000);
  });

  it("excludes completed and cancelled orders", () => {
    const orders: OrderSummary[] = [
      { total: 500000, amountPaid: 250000, amountDue: 250000, status: "COMPLETED" },
      { total: 300000, amountPaid: 100000, amountDue: 200000, status: "CANCELLED" },
    ];
    expect(calculateOutstanding(orders)).toBe(0);
  });

  it("returns 0 for empty orders", () => {
    expect(calculateOutstanding([])).toBe(0);
  });

  it("handles deposit where amountPaid > amountDue (overpayment)", () => {
    const orders: OrderSummary[] = [
      { total: 500000, amountPaid: 600000, amountDue: 0, status: "DEPOSIT_PAID" },
    ];
    expect(calculateOutstanding(orders)).toBe(0);
  });
});

// ─── Monthly sales grouping ───────────────────────────────────

interface RawOrder {
  createdAt: Date;
  total: number;
  status: string;
}

function groupByMonth(orders: RawOrder[]): Map<string, { count: number; revenue: number }> {
  const monthly = new Map<string, { count: number; revenue: number }>();
  for (const order of orders) {
    const key = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthly.get(key) || { count: 0, revenue: 0 };
    existing.count++;
    existing.revenue += order.total;
    monthly.set(key, existing);
  }
  return monthly;
}

describe("Reports - Monthly Sales Grouping", () => {
  it("groups orders by month", () => {
    const orders: RawOrder[] = [
      { createdAt: new Date("2026-01-10"), total: 100000, status: "PAID" },
      { createdAt: new Date("2026-01-20"), total: 200000, status: "PAID" },
      { createdAt: new Date("2026-02-05"), total: 150000, status: "PENDING" },
    ];
    const monthly = groupByMonth(orders);
    expect(monthly.size).toBe(2);
    expect(monthly.get("2026-01")).toEqual({ count: 2, revenue: 300000 });
    expect(monthly.get("2026-02")).toEqual({ count: 1, revenue: 150000 });
  });

  it("returns empty map for no orders", () => {
    expect(groupByMonth([]).size).toBe(0);
  });
});

// ─── Retention rate calculation ───────────────────────────────

function calculateRetentionRate(totalAlerts: number, sentAlerts: number): number {
  if (totalAlerts === 0) return 0;
  return Math.round((sentAlerts / totalAlerts) * 100);
}

describe("Reports - Maintenance Retention Rate", () => {
  it("calculates retention as percentage of sent alerts", () => {
    expect(calculateRetentionRate(100, 85)).toBe(85);
  });

  it("returns 0 when no alerts", () => {
    expect(calculateRetentionRate(0, 0)).toBe(0);
  });

  it("returns 100 when all alerts sent", () => {
    expect(calculateRetentionRate(50, 50)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(calculateRetentionRate(3, 1)).toBe(33);
    expect(calculateRetentionRate(3, 2)).toBe(67);
  });
});

// ─── Technician performance metrics ───────────────────────────

interface WorkOrderTimestamp {
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
}

function calculateAvgCompletionTime(workOrders: WorkOrderTimestamp[]): number | null {
  const completionTimes = workOrders
    .filter((wo) => wo.status === "COMPLETED" && wo.startedAt && wo.completedAt)
    .map((wo) => (wo.completedAt!.getTime() - wo.startedAt!.getTime()) / (1000 * 60 * 60));

  if (completionTimes.length === 0) return null;
  return Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length * 10) / 10;
}

describe("Reports - Technician Performance", () => {
  it("calculates average completion time in hours", () => {
    const workOrders: WorkOrderTimestamp[] = [
      { status: "COMPLETED", startedAt: new Date("2026-07-01T09:00:00Z"), completedAt: new Date("2026-07-01T12:00:00Z") },
      { status: "COMPLETED", startedAt: new Date("2026-07-02T08:00:00Z"), completedAt: new Date("2026-07-02T11:30:00Z") },
    ];
    expect(calculateAvgCompletionTime(workOrders)).toBe(3.3); // avg of 3h and 3.5h = 3.25, rounded to 3.3
  });

  it("returns null when no completed work orders", () => {
    expect(calculateAvgCompletionTime([])).toBeNull();
  });

  it("excludes in-progress work orders from average", () => {
    const workOrders: WorkOrderTimestamp[] = [
      { status: "COMPLETED", startedAt: new Date("2026-07-01T09:00:00Z"), completedAt: new Date("2026-07-01T12:00:00Z") },
      { status: "IN_PROGRESS", startedAt: new Date("2026-07-02T08:00:00Z"), completedAt: null },
    ];
    expect(calculateAvgCompletionTime(workOrders)).toBe(3);
  });
});
