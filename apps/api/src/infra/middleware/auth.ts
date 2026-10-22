import type { MiddlewareHandler } from "hono";
import { auth } from "../lib/auth";

export interface AuthVariables {
  user: any;
  session: any;
  userPermissions?: Set<string>;
  logger: any;
}

/**
 * requireAuth middleware
 * Verifies Better-Auth session, attaches user to context,
 * and enforces account status guards (banned, suspended, password reset).
 */
export const requireAuth: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user) {
    return c.json({ error: "Unauthorized", message: "Valid active session required." }, 401);
  }

  const user = session.user as any;

  // Guard 1: The Guillotine - Reject Banned Accounts immediately
  if (user.status === "banned" || user.banned) {
    return c.json(
      {
        error: "Forbidden",
        code: "ACCOUNT_BANNED",
        message: "This account has been permanently banned.",
        banReason: user.banReason || undefined,
      },
      403,
    );
  }

  // Guard 2: Reject Suspended Accounts
  if (user.status === "suspended") {
    return c.json(
      {
        error: "Forbidden",
        code: "ACCOUNT_SUSPENDED",
        message: "This account is temporarily suspended. Please contact store support.",
      },
      403,
    );
  }

  // Guard 3: Intercept for Forced Password Reset
  if (user.requiresPasswordReset && !c.req.path.includes("reset-password")) {
    return c.json(
      {
        error: "Forbidden",
        code: "REQUIRES_PASSWORD_RESET",
        message: "Security requirement: You must reset your password to proceed.",
      },
      403,
    );
  }

  c.set("user", user);
  c.set("session", session.session);
  await next();
};

/**
 * requireAdmin middleware
 * Quick convenience check for admin or super_admin system roles.
 */
export const requireAdmin: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  const user = c.get("user");

  if (!user) {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });
    if (!session?.user) {
      return c.json({ error: "Unauthorized", message: "Active session required." }, 401);
    }
    c.set("user", session.user);
    c.set("session", session.session);
  }

  const activeUser = c.get("user") as any;
  if (!activeUser || (activeUser.role !== "admin" && activeUser.role !== "super_admin")) {
    return c.json({ error: "Forbidden", message: "Store administrative role required." }, 403);
  }

  await next();
};
