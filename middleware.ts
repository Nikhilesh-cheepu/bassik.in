import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";

  // Handle www redirect - redirect www to non-www (bassik.in)
  // This ensures consistent domain usage and prevents mobile issues
  // Only redirect if we're on www subdomain
  if (hostname === "www.bassik.in") {
    url.hostname = "bassik.in";
    url.protocol = "https:";
    return NextResponse.redirect(url, 301); // Permanent redirect
  }

  // Ensure HTTPS in production (if not already)
  if (
    process.env.NODE_ENV === "production" &&
    url.protocol === "http:" &&
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

