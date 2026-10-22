import type { MiddlewareHandler } from "hono";
import type { AuthVariables } from "./auth";

/**
 * System role hierarchy.
 * Higher value represents broader privileges:
 * super_admin (3) > admin (2) > user (1)
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  user: 1,
  admin: 2,
  super_admin: 3,
};

/**
 * requireRole(minimumRole)
 * Enforces that the current authenticated user possesses at least the specified system role level.
 */
export const requireRole = (
  minimumRole: keyof typeof ROLE_HIERARCHY,
): MiddlewareHandler<{ Variables: AuthVariables }> => {
  return async (c, next) => {
    const user = c.get("user") as any;

    if (!user) {
      return c.json({ error: "Unauthorized", message: "Active session required." }, 401);
    }

    const userRole = (user.role as string) || "user";
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0;

    if (userLevel < requiredLevel) {
      return c.json(
        {
          error: "Forbidden",
          message: `Access denied. Requires ${minimumRole} privileges or higher.`,
        },
        403,
      );
    }

    await next();
  };
};
