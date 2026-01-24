import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Protect admin routes - require authentication AND admin role (except /admin which is the sign-in page)
  if (isAdminRoute(request) && pathname !== "/admin") {
    const { userId } = await auth();
    if (!userId) {
      const signInUrl = new URL("/admin", request.url);
      return NextResponse.redirect(signInUrl);
    }

    // Check if user has admin role using clerkClient (required in middleware)
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const role = user.publicMetadata?.role as string;
      if (role !== "admin" && role !== "main_admin") {
        // User is authenticated but not an admin - redirect to home
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch (error) {
      // If we can't fetch user, redirect to sign in for safety
      console.error("Error fetching user in middleware:", error);
      const signInUrl = new URL("/admin", request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Handle www redirect for custom domain when it's not a Vercel domain
  const hostname = request.headers.get("host") || "";
  if (hostname === "www.bassik.in" && !hostname.includes("vercel.app")) {
    const redirectUrl = new URL(request.url);
    redirectUrl.hostname = "bassik.in";
    redirectUrl.protocol = "https:";
    return NextResponse.redirect(redirectUrl, 301);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

