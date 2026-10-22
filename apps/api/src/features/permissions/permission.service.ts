import {
  db,
  PERMISSIONS_CATALOG,
  rolePermissions,
  userPermissions,
  userRoles,
  users,
} from "@growmate/db";
import { eq, inArray } from "drizzle-orm";
import { redis } from "../../infra/lib/redis";

export class PermissionService {
  /**
   * Resolves a user's permissions across GrowMate store.
   * Returns a Set of permission strings (e.g. Set { 'products:create', 'orders:update_status' })
   */
  static async resolvePermissions(userId: string): Promise<Set<string>> {
    const cacheKey = `perm:${userId}`;

    // 1. Check Redis Cache First (O(1) lookup)
    try {
      const cached = await redis.smembers(cacheKey);
      if (cached && cached.length > 0) {
        return new Set(cached);
      }
    } catch {
      // Redis fallback - proceed to database lookup
    }

    // 2. Fetch User & System Role
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return new Set();

    // Admin & Super Admin get universal store access
    if (user.role === "admin" || user.role === "super_admin") {
      const allPerms: string[] = PERMISSIONS_CATALOG.map((p) => p.key as string);
      allPerms.push("*");
      const permSet = new Set(allPerms);
      await this.saveToCache(cacheKey, permSet);
      return permSet;
    }

    // 3. Fetch User's Assigned Store Roles
    const userRoleMappings = await db.select().from(userRoles).where(eq(userRoles.userId, userId));
    const roleIds = userRoleMappings.map((ur) => ur.roleId);

    let basePermissions: string[] = [];
    if (roleIds.length > 0) {
      const rolePerms = await db
        .select()
        .from(rolePermissions)
        .where(inArray(rolePermissions.roleId, roleIds));
      basePermissions = rolePerms.map((rp) => rp.permissionKey);
    }

    // 4. Fetch Individual Allow/Deny Overrides
    const overrides = await db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.userId, userId));

    const allowOverrides = overrides.filter((o) => o.granted).map((o) => o.permissionKey);
    const denyOverrides = overrides.filter((o) => !o.granted).map((o) => o.permissionKey);

    // 5. The Resolution Formula: (Base Roles ∪ Allow Overrides) \ Deny Overrides
    const finalPermissionSet = new Set([...basePermissions, ...allowOverrides]);
    for (const denyKey of denyOverrides) {
      finalPermissionSet.delete(denyKey);
    }

    // 6. Save to Redis Cache (TTL: 15 minutes)
    await this.saveToCache(cacheKey, finalPermissionSet);

    return finalPermissionSet;
  }

  private static async saveToCache(cacheKey: string, perms: Set<string>): Promise<void> {
    if (perms.size === 0) return;
    try {
      const pipeline = redis.pipeline();
      const items = Array.from(perms) as [string, ...string[]];
      pipeline.sadd(cacheKey, ...items);
      pipeline.expire(cacheKey, 900); // 15 mins
      await pipeline.exec();
    } catch {
      // Ignore cache write errors
    }
  }

  /**
   * Clears the permission cache for a user.
   * Call whenever user roles or permissions are updated.
   */
  static async invalidateCache(userId: string): Promise<void> {
    try {
      await redis.del(`perm:${userId}`);
    } catch {
      // Ignore cache delete errors
    }
  }
}
