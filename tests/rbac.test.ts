import { describe, it, expect } from "vitest";

// RBAC configuration (extracted from middleware for testing)
const roleRoutes: Record<string, string[]> = {
  TECHNICIAN: ["/dashboard/technician"],
  OPERATIONS: ["/dashboard/operations"],
  SUPPORT: ["/dashboard/support"],
  ADMIN: ["/dashboard/admin", "/dashboard/operations", "/dashboard/support", "/dashboard/technician"],
};

function hasAccess(role: string, pathname: string): boolean {
  const allowedRoutes = roleRoutes[role] || [];
  return allowedRoutes.some((r) => pathname.startsWith(r));
}

describe("RBAC - Role-Based Access Control", () => {
  describe("ADMIN role", () => {
    it("can access admin dashboard", () => {
      expect(hasAccess("ADMIN", "/dashboard/admin")).toBe(true);
    });

    it("can access operations dashboard", () => {
      expect(hasAccess("ADMIN", "/dashboard/operations")).toBe(true);
    });

    it("can access support dashboard", () => {
      expect(hasAccess("ADMIN", "/dashboard/support")).toBe(true);
    });

    it("can access technician dashboard", () => {
      expect(hasAccess("ADMIN", "/dashboard/technician")).toBe(true);
    });

    it("can access nested admin routes", () => {
      expect(hasAccess("ADMIN", "/dashboard/admin/users")).toBe(true);
      expect(hasAccess("ADMIN", "/dashboard/admin/reports")).toBe(true);
    });
  });

  describe("OPERATIONS role", () => {
    it("can access operations dashboard", () => {
      expect(hasAccess("OPERATIONS", "/dashboard/operations")).toBe(true);
    });

    it("cannot access admin dashboard", () => {
      expect(hasAccess("OPERATIONS", "/dashboard/admin")).toBe(false);
    });

    it("cannot access support dashboard", () => {
      expect(hasAccess("OPERATIONS", "/dashboard/support")).toBe(false);
    });

    it("cannot access technician dashboard", () => {
      expect(hasAccess("OPERATIONS", "/dashboard/technician")).toBe(false);
    });

    it("can access nested operations routes", () => {
      expect(hasAccess("OPERATIONS", "/dashboard/operations/work-orders")).toBe(true);
    });
  });

  describe("SUPPORT role", () => {
    it("can access support dashboard", () => {
      expect(hasAccess("SUPPORT", "/dashboard/support")).toBe(true);
    });

    it("cannot access admin dashboard", () => {
      expect(hasAccess("SUPPORT", "/dashboard/admin")).toBe(false);
    });

    it("cannot access operations dashboard", () => {
      expect(hasAccess("SUPPORT", "/dashboard/operations")).toBe(false);
    });

    it("cannot access technician dashboard", () => {
      expect(hasAccess("SUPPORT", "/dashboard/technician")).toBe(false);
    });

    it("can access nested support routes", () => {
      expect(hasAccess("SUPPORT", "/dashboard/support/tickets")).toBe(true);
      expect(hasAccess("SUPPORT", "/dashboard/support/warranties")).toBe(true);
    });
  });

  describe("TECHNICIAN role", () => {
    it("can access technician dashboard", () => {
      expect(hasAccess("TECHNICIAN", "/dashboard/technician")).toBe(true);
    });

    it("cannot access admin dashboard", () => {
      expect(hasAccess("TECHNICIAN", "/dashboard/admin")).toBe(false);
    });

    it("cannot access operations dashboard", () => {
      expect(hasAccess("TECHNICIAN", "/dashboard/operations")).toBe(false);
    });

    it("cannot access support dashboard", () => {
      expect(hasAccess("TECHNICIAN", "/dashboard/support")).toBe(false);
    });

    it("can access nested technician routes", () => {
      expect(hasAccess("TECHNICIAN", "/dashboard/technician/route")).toBe(true);
    });
  });

  describe("Unknown role", () => {
    it("has no access to any dashboard", () => {
      expect(hasAccess("UNKNOWN", "/dashboard/admin")).toBe(false);
      expect(hasAccess("UNKNOWN", "/dashboard/operations")).toBe(false);
      expect(hasAccess("UNKNOWN", "/dashboard/support")).toBe(false);
      expect(hasAccess("UNKNOWN", "/dashboard/technician")).toBe(false);
    });
  });
});
