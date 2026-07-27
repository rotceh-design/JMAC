import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";
import { cookies } from "next/headers";

function decodeToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

/**
 * POST /api/work-orders/[id]/photos/presign
 *
 * Returns a presigned PUT URL so the client can upload directly to storage.
 * The server never handles the file bytes — just coordinates the URL.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const payload = decodeToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: { code: "INVALID_TOKEN", message: "Invalid token" } },
        { status: 401 }
      );
    }

    // Only technicians and admins can request presigned URLs
    if (payload.role !== "TECHNICIAN" && payload.role !== "ADMIN" && payload.role !== "OPERATIONS") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, contentType } = body;

    if (!type || !contentType) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "type ('before'|'after') and contentType required" } },
        { status: 400 }
      );
    }

    if (type !== "before" && type !== "after") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "type must be 'before' or 'after'" } },
        { status: 400 }
      );
    }

    // Verify work order exists and is assigned to this technician
    const workOrder = await db.workOrder.findUnique({ where: { id } });

    if (!workOrder) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Work order not found" } },
        { status: 404 }
      );
    }

    if (payload.role === "TECHNICIAN" && workOrder.technicianId !== payload.sub) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Work order not assigned to you" } },
        { status: 403 }
      );
    }

    // Generate object key
    const ext = contentType.split("/")[1] || "jpg";
    const timestamp = Date.now();
    const key = `work-orders/${id}/${type}/${timestamp}.${ext}`;

    const bucket = process.env.STORAGE_BUCKET || "jhon-aire-uploads";

    // TODO: Presigned upload URL does not currently constrain Content-Type or max
    // file size — a technician could theoretically upload an arbitrary file/size
    // to the bucket. Low risk for now (authenticated technicians only, internal
    // MVP), but should be restricted via S3 signature conditions (ContentType,
    // ContentLengthRange) before this app has any public-facing or less-trusted
    // upload surface.
    const provider = await getStorageProvider();
    const { uploadUrl, objectKey } = await provider.getPresignedUploadUrl({
      bucket,
      key,
      contentType,
    });

    return NextResponse.json({ uploadUrl, objectKey });
  } catch (error) {
    console.error("Presign error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to generate upload URL" } },
      { status: 500 }
    );
  }
}
