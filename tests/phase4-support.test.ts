import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── SLA due-by calculation ───────────────────────────────────

const SLA_HOURS: Record<string, number> = {
  LOW: 72,
  MEDIUM: 24,
  HIGH: 8,
  URGENT: 4,
};

function calculateDueAt(priority: string, createdAt: Date = new Date()): Date {
  const hours = SLA_HOURS[priority] || 24;
  const dueAt = new Date(createdAt);
  dueAt.setHours(dueAt.getHours() + hours);
  return dueAt;
}

function isOverdue(dueAt: Date | null): boolean {
  if (!dueAt) return false;
  return new Date() > dueAt;
}

function getSLABreachDuration(dueAt: Date | null): number | null {
  if (!dueAt) return null;
  const now = new Date();
  if (now <= dueAt) return null;
  return Math.floor((now.getTime() - dueAt.getTime()) / (1000 * 60)); // minutes
}

describe("SLA - Due-by calculation", () => {
  it("LOW priority: 72 hours", () => {
    const created = new Date("2026-07-27T09:00:00Z");
    const due = calculateDueAt("LOW", created);
    expect(due.toISOString()).toBe("2026-07-30T09:00:00.000Z");
  });

  it("MEDIUM priority: 24 hours", () => {
    const created = new Date("2026-07-27T09:00:00Z");
    const due = calculateDueAt("MEDIUM", created);
    expect(due.toISOString()).toBe("2026-07-28T09:00:00.000Z");
  });

  it("HIGH priority: 8 hours", () => {
    const created = new Date("2026-07-27T09:00:00Z");
    const due = calculateDueAt("HIGH", created);
    expect(due.toISOString()).toBe("2026-07-27T17:00:00.000Z");
  });

  it("URGENT priority: 4 hours", () => {
    const created = new Date("2026-07-27T09:00:00Z");
    const due = calculateDueAt("URGENT", created);
    expect(due.toISOString()).toBe("2026-07-27T13:00:00.000Z");
  });

  it("unknown priority defaults to 24 hours", () => {
    const created = new Date("2026-07-27T09:00:00Z");
    const due = calculateDueAt("UNKNOWN", created);
    expect(due.toISOString()).toBe("2026-07-28T09:00:00.000Z");
  });

  it("isOverdue returns true when past due", () => {
    const pastDue = new Date("2026-01-01T00:00:00Z");
    expect(isOverdue(pastDue)).toBe(true);
  });

  it("isOverdue returns false when not yet due", () => {
    const future = new Date("2099-12-31T23:59:59Z");
    expect(isOverdue(future)).toBe(false);
  });

  it("isOverdue returns false for null", () => {
    expect(isOverdue(null)).toBe(false);
  });

  it("getSLABreachDuration returns minutes when breached", () => {
    const dueAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const breach = getSLABreachDuration(dueAt);
    expect(breach).toBeGreaterThanOrEqual(119); // ~120 minutes
    expect(breach).toBeLessThanOrEqual(121);
  });

  it("getSLABreachDuration returns null when not breached", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    expect(getSLABreachDuration(future)).toBeNull();
  });
});

// ─── Equipment registry: WorkOrder linkage ─────────────────────

interface WarrantyRecord {
  id: string;
  serialNumber: string;
  workOrderId: string | null;
  lastServiceAt: string | null;
  installDate: string;
}

function validateWarrantyLinkage(warranty: WarrantyRecord): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!warranty.serialNumber) errors.push("serialNumber is required");
  if (!warranty.installDate) errors.push("installDate is required");
  if (warranty.lastServiceAt && new Date(warranty.lastServiceAt) < new Date(warranty.installDate)) {
    errors.push("lastServiceAt cannot be before installDate");
  }

  return { valid: errors.length === 0, errors };
}

describe("Equipment Registry - WorkOrder linkage", () => {
  it("warranty can have a workOrderId", () => {
    const warranty: WarrantyRecord = {
      id: "w1",
      serialNumber: "SN-001",
      workOrderId: "wo_abc123",
      lastServiceAt: null,
      installDate: "2026-01-15",
    };
    expect(warranty.workOrderId).toBe("wo_abc123");
  });

  it("warranty can exist without workOrderId (manual entry)", () => {
    const warranty: WarrantyRecord = {
      id: "w2",
      serialNumber: "SN-002",
      workOrderId: null,
      lastServiceAt: null,
      installDate: "2026-03-01",
    };
    expect(warranty.workOrderId).toBeNull();
  });

  it("validates serial number is required", () => {
    const warranty: WarrantyRecord = {
      id: "w3",
      serialNumber: "",
      workOrderId: null,
      lastServiceAt: null,
      installDate: "2026-01-01",
    };
    const result = validateWarrantyLinkage(warranty);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("serialNumber is required");
  });

  it("validates lastServiceAt cannot be before installDate", () => {
    const warranty: WarrantyRecord = {
      id: "w4",
      serialNumber: "SN-004",
      workOrderId: null,
      lastServiceAt: "2025-01-01",
      installDate: "2026-01-01",
    };
    const result = validateWarrantyLinkage(warranty);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("lastServiceAt cannot be before installDate");
  });

  it("validates a valid warranty record", () => {
    const warranty: WarrantyRecord = {
      id: "w5",
      serialNumber: "SN-005",
      workOrderId: "wo_xyz",
      lastServiceAt: "2026-07-01",
      installDate: "2026-01-15",
    };
    const result = validateWarrantyLinkage(warranty);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ─── Maintenance alert scheduling ─────────────────────────────

interface MaintenanceAlert {
  warrantyId: string;
  alertType: "SIX_MONTH" | "TWELVE_MONTH";
  scheduledFor: Date;
  status: "PENDING" | "SENT" | "FAILED";
}

function scheduleAlerts(installDate: Date, warrantyId: string): MaintenanceAlert[] {
  const sixMonths = new Date(installDate);
  sixMonths.setMonth(sixMonths.getMonth() + 6);

  const twelveMonths = new Date(installDate);
  twelveMonths.setMonth(twelveMonths.getMonth() + 12);

  return [
    { warrantyId, alertType: "SIX_MONTH", scheduledFor: sixMonths, status: "PENDING" },
    { warrantyId, alertType: "TWELVE_MONTH", scheduledFor: twelveMonths, status: "PENDING" },
  ];
}

function deduplicateAlerts(alerts: MaintenanceAlert[]): MaintenanceAlert[] {
  const seen = new Set<string>();
  return alerts.filter((a) => {
    const key = `${a.warrantyId}:${a.alertType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

describe("Maintenance Alert Scheduling", () => {
  it("schedules 6-month and 12-month alerts", () => {
    const installDate = new Date("2026-01-15T00:00:00Z");
    const alerts = scheduleAlerts(installDate, "w_1");

    expect(alerts).toHaveLength(2);
    expect(alerts[0].alertType).toBe("SIX_MONTH");
    expect(alerts[0].scheduledFor.getUTCMonth()).toBe(6);
    expect(alerts[0].scheduledFor.getUTCDate()).toBe(15);
    expect(alerts[0].scheduledFor.getUTCFullYear()).toBe(2026);

    expect(alerts[1].alertType).toBe("TWELVE_MONTH");
    expect(alerts[1].scheduledFor.getUTCMonth()).toBe(0);
    expect(alerts[1].scheduledFor.getUTCDate()).toBe(15);
    expect(alerts[1].scheduledFor.getUTCFullYear()).toBe(2027);
  });

  it("all alerts start as PENDING", () => {
    const alerts = scheduleAlerts(new Date("2026-06-01T00:00:00Z"), "w_2");
    expect(alerts.every((a) => a.status === "PENDING")).toBe(true);
  });

  it("deduplication prevents duplicate alert types", () => {
    const alerts: MaintenanceAlert[] = [
      { warrantyId: "w1", alertType: "SIX_MONTH", scheduledFor: new Date(), status: "PENDING" },
      { warrantyId: "w1", alertType: "SIX_MONTH", scheduledFor: new Date(), status: "PENDING" },
      { warrantyId: "w1", alertType: "TWELVE_MONTH", scheduledFor: new Date(), status: "PENDING" },
    ];

    const deduped = deduplicateAlerts(alerts);
    expect(deduped).toHaveLength(2);
    expect(deduped.filter((a) => a.alertType === "SIX_MONTH")).toHaveLength(1);
  });

  it("deduplication is per-warranty (different warranties with same type are kept)", () => {
    const alerts: MaintenanceAlert[] = [
      { warrantyId: "w1", alertType: "SIX_MONTH", scheduledFor: new Date(), status: "PENDING" },
      { warrantyId: "w2", alertType: "SIX_MONTH", scheduledFor: new Date(), status: "PENDING" },
    ];

    const deduped = deduplicateAlerts(alerts);
    expect(deduped).toHaveLength(2);
  });
});

// ─── Maintenance cron endpoint security ───────────────────────

describe("Maintenance Cron - Security", () => {
  const CORRECT_SECRET = "test-cron-secret-abc123";

  function checkCronSecret(
    requestSecret: string | null,
    envSecret: string | undefined
  ): { allowed: boolean; status: number } {
    if (!envSecret || requestSecret !== envSecret) {
      return { allowed: false, status: 401 };
    }
    return { allowed: true, status: 200 };
  }

  it("rejects request without x-cron-secret header", () => {
    const result = checkCronSecret(null, CORRECT_SECRET);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(401);
  });

  it("rejects request with wrong x-cron-secret", () => {
    const result = checkCronSecret("wrong-secret", CORRECT_SECRET);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(401);
  });

  it("rejects request with empty string secret when env is set", () => {
    const result = checkCronSecret("", CORRECT_SECRET);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(401);
  });

  it("accepts request with correct x-cron-secret", () => {
    const result = checkCronSecret(CORRECT_SECRET, CORRECT_SECRET);
    expect(result.allowed).toBe(true);
    expect(result.status).toBe(200);
  });

  it("rejects when CRON_SECRET env is not set", () => {
    const result = checkCronSecret(CORRECT_SECRET, undefined);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(401);
  });

  it("rejects when both header and env are empty strings", () => {
    const result = checkCronSecret("", "");
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(401);
  });
});

// ─── Ticket creation ──────────────────────────────────────────

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  dueAt: Date | null;
  creatorId: string;
  assigneeId: string | null;
}

function createTicket(input: {
  subject: string;
  priority?: string;
  creatorId: string;
  assigneeId?: string;
  count: number;
}): Ticket {
  const priority = input.priority || "MEDIUM";
  const ticketNumber = `TKT-${String(input.count + 1).padStart(5, "0")}`;
  const dueAt = calculateDueAt(priority);

  return {
    id: `ticket_${input.count + 1}`,
    ticketNumber,
    subject: input.subject,
    status: "OPEN",
    priority,
    dueAt,
    creatorId: input.creatorId,
    assigneeId: input.assigneeId || null,
  };
}

describe("Support Tickets - Creation & SLA", () => {
  it("creates ticket with auto-generated number", () => {
    const ticket = createTicket({
      subject: "AC not cooling",
      creatorId: "user_1",
      count: 0,
    });
    expect(ticket.ticketNumber).toBe("TKT-00001");
    expect(ticket.status).toBe("OPEN");
  });

  it("ticket number increments correctly", () => {
    const ticket = createTicket({
      subject: "Leak",
      creatorId: "user_1",
      count: 42,
    });
    expect(ticket.ticketNumber).toBe("TKT-00043");
  });

  it("dueAt is set based on priority", () => {
    const ticket = createTicket({
      subject: "Urgent issue",
      priority: "URGENT",
      creatorId: "user_1",
      count: 0,
    });
    expect(ticket.dueAt).toBeTruthy();
    const hoursUntilDue = (ticket.dueAt!.getTime() - Date.now()) / (1000 * 60 * 60);
    expect(hoursUntilDue).toBeGreaterThan(3.9);
    expect(hoursUntilDue).toBeLessThanOrEqual(4.1);
  });

  it("defaults to MEDIUM priority when not specified", () => {
    const ticket = createTicket({
      subject: "General issue",
      creatorId: "user_1",
      count: 0,
    });
    expect(ticket.priority).toBe("MEDIUM");
  });
});

// ─── Ticket numbering race condition ──────────────────────────

describe("Ticket Numbering - Concurrency", () => {
  /**
   * Simulates the atomic counter pattern used in the API.
   * In production this is a DB upsert — here we simulate the atomicity
   * by using a shared mutable counter that increments atomically.
   */
  function createAtomicCounter(initial: number) {
    let value = initial;
    return {
      next: () => {
        value += 1;
        return value;
      },
      current: () => value,
    };
  }

  it("atomic counter produces unique values under concurrent access", async () => {
    const counter = createAtomicCounter(0);
    const results: number[] = [];

    // Simulate 10 concurrent ticket creations
    const promises = Array.from({ length: 10 }, async () => {
      const val = counter.next();
      results.push(val);
    });

    await Promise.all(promises);

    // All 10 values must be unique
    const unique = new Set(results);
    expect(unique.size).toBe(10);
    expect(results.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("concurrent ticket numbers are all unique", async () => {
    // Simulate what the API does: atomic counter → format TKT-NNNNN
    const counter = createAtomicCounter(0);
    const numbers: string[] = [];

    const promises = Array.from({ length: 10 }, async () => {
      const val = counter.next();
      const ticketNumber = `TKT-${String(val).padStart(5, "0")}`;
      numbers.push(ticketNumber);
    });

    await Promise.all(promises);

    const unique = new Set(numbers);
    expect(unique.size).toBe(10);

    // Verify format
    numbers.forEach((n) => {
      expect(n).toMatch(/^TKT-\d{5}$/);
    });
  });

  it("counter never produces duplicate even with rapid calls", () => {
    const counter = createAtomicCounter(100);
    const seen = new Set<number>();

    for (let i = 0; i < 1000; i++) {
      const val = counter.next();
      expect(seen.has(val)).toBe(false);
      seen.add(val);
    }

    expect(seen.size).toBe(1000);
  });
});
