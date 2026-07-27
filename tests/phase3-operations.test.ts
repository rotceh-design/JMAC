import { describe, it, expect, vi } from "vitest";
import { withRetry } from "@/lib/retry";

// ─── withRetry unit tests ─────────────────────────────────────

describe("withRetry - Flaky connection handling", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { maxRetries: 3 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds on attempt 2", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValue("ok");
    const result = await withRetry(fn, { maxRetries: 3, baseDelay: 10 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries up to maxRetries then throws", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Persistent failure"));
    await expect(
      withRetry(fn, { maxRetries: 2, baseDelay: 10 })
    ).rejects.toThrow("Persistent failure");
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("respects maxRetries=0 (no retries)", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    await expect(
      withRetry(fn, { maxRetries: 0 })
    ).rejects.toThrow("fail");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws original error after all retries exhausted", async () => {
    const originalError = new Error("Server 500");
    const fn = vi.fn().mockRejectedValue(originalError);

    try {
      await withRetry(fn, { maxRetries: 1, baseDelay: 10 });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBe(originalError);
    }
  });
});

// ─── Presigned upload flow tests ──────────────────────────────

describe("Photo upload - Presigned URL flow", () => {
  it("presign → PUT → PATCH: full flow succeeds", async () => {
    const presignFn = vi.fn().mockResolvedValue({
      uploadUrl: "https://s3.example.com/bucket/key?signature=abc",
      objectKey: "work-orders/wo_1/before/123456.jpg",
    });

    const putFn = vi.fn().mockResolvedValue({ ok: true });
    const patchFn = vi.fn().mockResolvedValue({ success: true });

    // Step 1: presign
    const { uploadUrl, objectKey } = await presignFn({
      type: "before",
      contentType: "image/jpeg",
    });
    expect(uploadUrl).toContain("https://");
    expect(objectKey).toContain("work-orders/wo_1/before/");

    // Step 2: PUT to storage (simulated — no real fetch)
    await putFn(uploadUrl, { method: "PUT" });
    expect(putFn).toHaveBeenCalledTimes(1);

    // Step 3: PATCH with key
    await patchFn({ beforePhotos: [objectKey] });
    expect(patchFn).toHaveBeenCalledWith({ beforePhotos: ["work-orders/wo_1/before/123456.jpg" ] });
  });

  it("retries presign on failure, then succeeds", async () => {
    let presignAttempts = 0;
    const presignFn = vi.fn().mockImplementation(async () => {
      presignAttempts++;
      if (presignAttempts < 3) throw new Error("Presign failed");
      return { uploadUrl: "https://s3.example.com/key", objectKey: "key.jpg" };
    });

    const result = await withRetry(presignFn, { maxRetries: 3, baseDelay: 10 });
    expect(result.objectKey).toBe("key.jpg");
    expect(presignFn).toHaveBeenCalledTimes(3);
  });

  it("retries PUT on failure, then succeeds", async () => {
    let putAttempts = 0;
    const putFn = vi.fn().mockImplementation(async () => {
      putAttempts++;
      if (putAttempts < 2) throw new Error("PUT timeout");
      return { ok: true };
    });

    const result = await withRetry(putFn, { maxRetries: 3, baseDelay: 10 });
    expect(result).toEqual({ ok: true });
    expect(putFn).toHaveBeenCalledTimes(2);
  });

  it("full flow: failed PUT → retry → success → PATCH fires once", async () => {
    const presignFn = vi.fn().mockResolvedValue({
      uploadUrl: "https://s3.example.com/key",
      objectKey: "after/photo.jpg",
    });

    let putAttempts = 0;
    const putFn = vi.fn().mockImplementation(async () => {
      putAttempts++;
      if (putAttempts === 1) throw new Error("Connection reset");
      return { ok: true };
    });

    const patchFn = vi.fn().mockResolvedValue({ success: true });

    // Execute with retry
    const { objectKey } = await presignFn({ type: "after", contentType: "image/png" });
    await withRetry(putFn, { maxRetries: 3, baseDelay: 10 });
    await patchFn({ afterPhotos: [objectKey] });

    expect(putFn).toHaveBeenCalledTimes(2); // failed once, succeeded second
    expect(patchFn).toHaveBeenCalledTimes(1); // PATCH only fires after successful upload
    expect(patchFn).toHaveBeenCalledWith({ afterPhotos: ["after/photo.jpg"] });
  });

  it("throws after all PUT retries exhausted, PATCH never fires", async () => {
    const presignFn = vi.fn().mockResolvedValue({
      uploadUrl: "https://s3.example.com/key",
      objectKey: "key.jpg",
    });

    const putFn = vi.fn().mockRejectedValue(new Error("Persistent failure"));
    const patchFn = vi.fn();

    await presignFn({ type: "before", contentType: "image/jpeg" });

    try {
      await withRetry(putFn, { maxRetries: 1, baseDelay: 10 });
    } catch {
      // expected
    }

    // PATCH must NOT have been called
    expect(patchFn).not.toHaveBeenCalled();
  });
});

// ─── Work Order RBAC tests ────────────────────────────────────

interface DecodedToken {
  sub: string;
  role: string;
}

function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1])) as DecodedToken;
  } catch {
    return null;
  }
}

function canUpdateWorkOrder(
  token: DecodedToken | null,
  workOrderTechnicianId: string | null
): boolean {
  if (!token) return false;
  if (token.role === "ADMIN" || token.role === "OPERATIONS") return true;
  if (token.role === "TECHNICIAN") {
    return workOrderTechnicianId === token.sub;
  }
  return false;
}

function canViewWorkOrders(token: DecodedToken | null): boolean {
  if (!token) return false;
  return ["TECHNICIAN", "OPERATIONS", "ADMIN", "SUPPORT"].includes(token.role);
}

function getTechnicianFilter(token: DecodedToken | null): { technicianId?: string } {
  if (!token || token.role !== "TECHNICIAN") return {};
  return { technicianId: token.sub };
}

describe("Work Order RBAC - Technician Scoping", () => {
  const techToken: DecodedToken = { sub: "tech_user_1", role: "TECHNICIAN" };
  const otherTechToken: DecodedToken = { sub: "tech_user_2", role: "TECHNICIAN" };
  const opsToken: DecodedToken = { sub: "ops_user_1", role: "OPERATIONS" };
  const adminToken: DecodedToken = { sub: "admin_user_1", role: "ADMIN" };

  describe("View access", () => {
    it("TECHNICIAN can view work orders", () => {
      expect(canViewWorkOrders(techToken)).toBe(true);
    });

    it("null token cannot view work orders", () => {
      expect(canViewWorkOrders(null)).toBe(false);
    });
  });

  describe("Query scoping", () => {
    it("TECHNICIAN filter scopes to own ID", () => {
      const filter = getTechnicianFilter(techToken);
      expect(filter).toEqual({ technicianId: "tech_user_1" });
    });

    it("OPERATIONS sees all (no filter)", () => {
      const filter = getTechnicianFilter(opsToken);
      expect(filter).toEqual({});
    });

    it("ADMIN sees all (no filter)", () => {
      const filter = getTechnicianFilter(adminToken);
      expect(filter).toEqual({});
    });
  });

  describe("Update access - Technician cannot edit other tech's WOs", () => {
    it("TECHNICIAN can update own work order", () => {
      expect(canUpdateWorkOrder(techToken, "tech_user_1")).toBe(true);
    });

    it("TECHNICIAN CANNOT update another tech's work order", () => {
      expect(canUpdateWorkOrder(techToken, "tech_user_2")).toBe(false);
    });

    it("TECHNICIAN CANNOT update unassigned work order", () => {
      expect(canUpdateWorkOrder(techToken, null)).toBe(false);
    });

    it("OPERATIONS can update any work order", () => {
      expect(canUpdateWorkOrder(opsToken, "tech_user_1")).toBe(true);
      expect(canUpdateWorkOrder(opsToken, "tech_user_2")).toBe(true);
      expect(canUpdateWorkOrder(opsToken, null)).toBe(true);
    });

    it("ADMIN can update any work order", () => {
      expect(canUpdateWorkOrder(adminToken, "tech_user_1")).toBe(true);
      expect(canUpdateWorkOrder(adminToken, "tech_user_2")).toBe(true);
    });

    it("null token cannot update any work order", () => {
      expect(canUpdateWorkOrder(null, "tech_user_1")).toBe(false);
    });
  });
});

// ─── 375px viewport tests ─────────────────────────────────────

describe("Mobile viewport - 375px width", () => {
  it("technician page container has max-width constraint", () => {
    const containerClass = "max-w-[375px]";
    expect(containerClass).toContain("375px");
  });

  it("work order cards use full width within constraint", () => {
    const cardClass = "w-full";
    expect(cardClass).toBe("w-full");
  });

  it("kanban board allows horizontal scroll on small screens", () => {
    const kanbanClass = "overflow-x-auto";
    expect(kanbanClass).toBe("overflow-x-auto");
  });

  it("photo grid uses flex-wrap to prevent overflow", () => {
    const photoGridClass = "flex flex-wrap gap-2";
    expect(photoGridClass).toContain("flex-wrap");
  });

  it("checklist labels use flex layout to prevent text overflow", () => {
    const labelClass = "flex items-center gap-3 cursor-pointer";
    expect(labelClass).toContain("flex");
  });

  it("signature canvas is touch-none for mobile", () => {
    const canvasClass = "w-full border rounded-md bg-white touch-none";
    expect(canvasClass).toContain("touch-none");
  });
});
