import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Only handle www redirect for custom domain when it's not a Vercel domain
  const hostname = request.headers.get("host") || "";
  if (hostname === "www.bassik.in" && !hostname.includes("vercel.app")) {
    const redirectUrl = new URL(request.url);
    redirectUrl.hostname = "bassik.in";
    redirectUrl.protocol = "https:";
    return NextResponse.redirect(redirectUrl, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

