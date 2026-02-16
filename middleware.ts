import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

const isAdminRoute = (pathname: string) => pathname.startsWith("/admin");

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
    const isAdmin = await getAdminSession(request);
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // Admin API routes: require admin session
  if (pathname.startsWith("/api/admin")) {
    const isAdmin = await getAdminSession(request);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
