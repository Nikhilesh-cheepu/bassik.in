import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";
  const pathname = url.pathname;

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Optional: Redirect www to non-www if www domain is still configured
  // If you remove www.bassik.in from Vercel, this won't trigger
  if (hostname === "www.bassik.in") {
    url.hostname = "bassik.in";
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }

  // Ensure HTTPS in production (Vercel usually handles this, but just in case)
  if (
    process.env.NODE_ENV === "production" &&
    url.protocol === "http:" &&
    !hostname.includes("localhost") &&
    !hostname.includes("127.0.0.1") &&
    request.headers.get("x-forwarded-proto") !== "https"
  ) {
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

