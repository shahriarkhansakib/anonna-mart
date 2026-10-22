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

  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5003";
  const appUrl = rawAppUrl.endsWith("/") ? rawAppUrl.slice(0, -1) : rawAppUrl;
  const cookieHeader = request.headers.get("cookie") || "";

  let sessionData: any = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${appUrl}/api/auth/get-session`, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
        accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      sessionData = await res.json();
    }
  } catch (_err) {
    // In edge or dev network timeout, fall through safely
  }

  const isAuthenticated = !!sessionData?.session;
  const user = sessionData?.user;
  const role = user?.role || "user";
  const isStaff = role === "admin" || role === "super_admin";

  // 1. Account Status Enforcement (Banned / Suspended)
  if (user && (user.status === "banned" || user.banned) && pathname !== "/blocked") {
    return NextResponse.redirect(new URL("/blocked", request.url));
  }
  if (user && user.status === "suspended" && pathname !== "/blocked") {
    return NextResponse.redirect(new URL("/blocked", request.url));
  }

  // 2. Forced Password Reset
  if (user && user.requiresPasswordReset === true && !pathname.startsWith("/reset-password")) {
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }

  // 3. Unauthenticated access to /admin/*
  if (isAdminRoute && !isAuthenticated) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // 4. Authenticated non-staff attempting to access /admin/*
  if (isAdminRoute && isAuthenticated && !isStaff) {
    // Customer logged in, trying to enter admin panel -> redirect to storefront
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 5. Unauthenticated access to customer account pages
  if (isCustomerAccountRoute && !isAuthenticated) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // 6. Logged-in users attempting to access sign-in / sign-up
  if (isAuthRoute && isAuthenticated) {
    const redirectTarget = searchParams.get("redirect");
    if (redirectTarget) {
      return NextResponse.redirect(new URL(redirectTarget, request.url));
    }
    // Route staff to /admin, customers to storefront
    if (isStaff) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.redirect(new URL("/account", request.url));
  }

  const response = NextResponse.next();
  response.headers.set("x-middleware-cache", "no-cache");
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets|public).*)"],
};
