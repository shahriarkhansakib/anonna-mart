import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const isAuthRoute =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/auth/admin");

  const isAdminRoute = pathname.startsWith("/admin");
  const isCustomerAccountRoute = pathname.startsWith("/account");

  // Only run session verification on protected or auth routes to keep public storefront fast
  if (!isAuthRoute && !isAdminRoute && !isCustomerAccountRoute) {
    return NextResponse.next();
  }

  const hasSessionCookie =
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token");

  // 1. Unauthenticated access to /admin/* or /account/* without session cookie
  if ((isAdminRoute || isCustomerAccountRoute) && !hasSessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // 2. Already logged in users accessing auth pages — redirect to account page.
  // Role-based routing (admin vs customer) is handled client-side by AdminAuthGuard
  // and the sign-in page useEffect once the user's role is known.
  if (isAuthRoute && hasSessionCookie) {
    const redirectTarget = searchParams.get("redirect");
    if (
      redirectTarget &&
      !redirectTarget.includes("sign-in") &&
      !redirectTarget.includes("login")
    ) {
      return NextResponse.redirect(new URL(redirectTarget, request.url));
    }
    // Default: send to /account — the account page will redirect admins to /admin client-side
    return NextResponse.redirect(new URL("/account", request.url));
  }

  const response = NextResponse.next();
  response.headers.set("x-middleware-cache", "no-cache");
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets|public).*)"],
};
