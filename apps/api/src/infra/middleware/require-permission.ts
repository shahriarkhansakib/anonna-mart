import type { AppPermission } from "@growmate/db";
import type { MiddlewareHandler } from "hono";
import { PermissionService } from "../../features/permissions/permission.service";
import type { AuthVariables } from "./auth";

/**
 * requirePermission(requiredPermission)
 * Enforces that the authenticated user possesses the specific store PBAC permission(s).
 * Super Admins bypass all granular checks automatically.
 */
export const requirePermission = (
  requiredPermission: AppPermission | AppPermission[],
): MiddlewareHandler<{ Variables: AuthVariables }> => {
  return async (c, next) => {
    const user = c.get("user") as any;

    if (!user) {
      return c.json({ error: "Unauthorized", message: "Active session required." }, 401);
    }

    // Admin & Super Admin Wildcard Bypass in single-store architecture
    if (user.role === "admin" || user.role === "super_admin") {
      return await next();
    }

    // Resolve user's permissions from cache or DB
    const userPermissions = await PermissionService.resolvePermissions(user.id);
    c.set("userPermissions", userPermissions);

    const hasPermission = Array.isArray(requiredPermission)
      ? requiredPermission.some((perm) => userPermissions.has(perm) || userPermissions.has("*"))
      : userPermissions.has(requiredPermission) || userPermissions.has("*");

    if (!hasPermission) {
      const permDesc = Array.isArray(requiredPermission)
        ? requiredPermission.join(" or ")
        : requiredPermission;

      return c.json(
        {
          error: "Forbidden",
          code: "INSUFFICIENT_PERMISSIONS",
          message: `You do not have the required permission: ${permDesc}`,
        },
        403,
      );
    }

    await next();
  };
};
