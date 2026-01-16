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

  // Only redirect www to non-www for bassik.in domain
  // This prevents redirect loops and TLS issues on mobile
  if (hostname === "www.bassik.in") {
    // Build the redirect URL using the original request URL
    const redirectUrl = new URL(request.url);
    redirectUrl.hostname = "bassik.in";
    redirectUrl.protocol = "https:";
    // Preserve pathname and search params
    return NextResponse.redirect(redirectUrl, 301);
  }

  // Don't enforce HTTPS here - Vercel handles SSL/TLS automatically
  // This prevents TLS errors on mobile browsers
  // Mobile browsers are stricter about SSL certificate validation
  // Let Vercel's edge network handle all SSL/TLS termination

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

