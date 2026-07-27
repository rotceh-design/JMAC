import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Simple JWT decode (no verification in dev - production should verify)
function decodeToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

export async function GET() {
  try {
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

    // Check expiry
    if (typeof payload.exp === "number" && payload.exp < Date.now() / 1000) {
      return NextResponse.json(
        { error: { code: "TOKEN_EXPIRED", message: "Token expired" } },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      { status: 500 }
    );
  }
}
