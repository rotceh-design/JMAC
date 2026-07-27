import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

function decodeToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

const roleRoutes: Record<string, string[]> = {
  TECHNICIAN: ["/dashboard/technician"],
  OPERATIONS: ["/dashboard/operations"],
  SUPPORT: ["/dashboard/support"],
  ADMIN: ["/dashboard/admin", "/dashboard/operations", "/dashboard/support", "/dashboard/technician"],
};

function getSecurityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Add security headers
  const headers = getSecurityHeaders();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  // Rate limiting for auth endpoints
  if (pathname.startsWith("/api/auth")) {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const { allowed } = checkRateLimit(`auth:${ip}`, 10, 60000); // 10 requests per minute

    if (!allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
        { status: 429 }
      );
    }
  }

  // Rate limiting for quote endpoint
  if (pathname === "/api/quote" && request.method === "POST") {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const { allowed } = checkRateLimit(`quote:${ip}`, 5, 60000); // 5 per minute

    if (!allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many quote requests. Please try again later." } },
        { status: 429 }
      );
    }
  }

  // Public routes
  const publicPaths = ["/", "/login", "/register", "/catalog", "/quote", "/checkout", "/scheduling", "/api/auth"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return response;
  }

  // Require auth for dashboard
  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const payload = decodeToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (typeof payload.exp === "number" && payload.exp < Date.now() / 1000) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const userRole = payload.role as string;
    const allowedRoutes = roleRoutes[userRole] || [];

    if (!allowedRoutes.some((r) => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL("/dashboard/unauthorized", request.url));
    }
  }

  // Require auth for API routes (except public ones)
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth")) {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
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
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
