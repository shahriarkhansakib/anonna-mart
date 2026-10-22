import { db, roles, userRoles } from "@growmate/db";
import { eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { requireAuth } from "../../infra/middleware/auth";
import { PermissionService } from "./permission.service";

export const permissionsRouter = new Hono();

permissionsRouter.get("/me", requireAuth, async (c) => {
  const user = c.get("user") as any;
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const permissionsSet = await PermissionService.resolvePermissions(user.id);

  // Fetch role names for UI presentation
  const userRoleMaps = await db.select().from(userRoles).where(eq(userRoles.userId, user.id));
  const roleIds = userRoleMaps.map((ur) => ur.roleId);

  let roleNames: string[] = [];
  if (roleIds.length > 0) {
    const roleRecords = await db.select().from(roles).where(inArray(roles.id, roleIds));
    roleNames = roleRecords.map((r) => r.name);
  }

  const isSuperAdmin = user.role === "super_admin" || user.role === "admin";
  if (isSuperAdmin && !roleNames.includes("Admin") && !roleNames.includes("Super Admin")) {
    roleNames.unshift(user.role === "super_admin" ? "Super Admin" : "Admin");
  }

  return c.json({
    success: true,
    data: {
      userId: user.id,
      systemRole: user.role,
      roles: roleNames,
      isSuperAdmin,
      permissions: Array.from(permissionsSet),
    },
  });
});
