import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAdminScopeFromRequest } from "@/lib/admin-auth";

const isAdminRoute = (pathname: string) => pathname.startsWith("/admin");

/** Sub-admins: dashboard, bookings, venues only (API enforces data scope). */
function outletAdminAllowedPath(pathname: string): boolean {
  if (pathname === "/admin/dashboard") return true;
  if (pathname.startsWith("/admin/dashboard/bookings")) return true;
  if (pathname.startsWith("/admin/dashboard/reviews")) return true;
  if (pathname === "/admin/dashboard/venues" || pathname.startsWith("/admin/dashboard/venues/")) {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Admin UI routes: require admin session (except /admin which is the login page)
  if (isAdminRoute(pathname) && pathname !== "/admin") {
    const scope = await getAdminScopeFromRequest(request);
    if (!scope) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (scope.kind === "outlet" && !outletAdminAllowedPath(pathname)) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  // www redirect for custom domain
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
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
