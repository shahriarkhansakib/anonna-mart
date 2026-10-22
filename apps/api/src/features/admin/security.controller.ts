import { randomUUID } from "node:crypto";
import { auditLogs, db, sessions, twoFactor, users } from "@growmate/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";
import { auth } from "../../infra/lib/auth";
import { logger } from "../../infra/lib/logger";
import { redis } from "../../infra/lib/redis";
import { ROLE_HIERARCHY } from "../../infra/middleware/role";
import { PermissionService } from "../permissions/permission.service";


const SecurityActionSchema = z.object({
  targetUserId: z.string().min(1, "Target User ID is required"),
  action: z.enum(["ban", "unban", "suspend", "unsuspend", "require_reset", "reset_mfa"]),
  reason: z.string().min(6, "Audit reason must be at least 6 characters"),
});

export class SecurityController {
  static async enforceSecurityAction(c: Context) {
    try {
      const body = await c.req.json();
      const parsed = SecurityActionSchema.safeParse(body);

      if (!parsed.success) {
        return c.json({ error: "Bad Request", issues: parsed.error.format() }, 400);
      }

      const { targetUserId, action, reason } = parsed.data;
      const adminUser = c.get("user") as any;

      if (!adminUser) {
        return c.json({ error: "Unauthorized", message: "Admin session required." }, 401);
      }

      if (adminUser.id === targetUserId) {
        return c.json(
          { error: "Conflict", message: "You cannot execute security actions on your own account." },
          409,
        );
      }

      // Query target user
      const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));
      if (!targetUser) {
        return c.json({ error: "Not Found", message: "Target user not found." }, 404);
      }

      const actorLevel = ROLE_HIERARCHY[adminUser.role] ?? 1;
      const targetLevel = ROLE_HIERARCHY[targetUser.role] ?? 1;

      // Prevent privilege escalation: actor must strictly outrank target, unless actor is super_admin
      if (targetLevel >= actorLevel && actorLevel < 3) {
        return c.json(
          {
            error: "Forbidden",
            message: "Privilege escalation denied. You cannot modify a user with equal or higher role.",
          },
          403,
        );
      }

      const updatePayload: Record<string, any> = { updatedAt: new Date() };

      if (action === "ban") {
        updatePayload.status = "banned";
        updatePayload.banned = true;
        updatePayload.banReason = reason;
      } else if (action === "unban") {
        updatePayload.status = "active";
        updatePayload.banned = false;
        updatePayload.banReason = null;
      } else if (action === "suspend") {
        updatePayload.status = "suspended";
      } else if (action === "unsuspend") {
        updatePayload.status = "active";
      } else if (action === "require_reset") {
        updatePayload.requiresPasswordReset = true;
      } else if (action === "reset_mfa") {
        updatePayload.twoFactorEnabled = false;
      }

      // Update database
      await db.update(users).set(updatePayload).where(eq(users.id, targetUserId));

      if (action === "reset_mfa") {
        await db.delete(twoFactor).where(eq(twoFactor.userId, targetUserId));
      }

      // The Session Guillotine: revoke all active sessions if banning/suspending or forcing reset
      if (["ban", "suspend", "require_reset", "reset_mfa"].includes(action)) {
        try {
          await db.delete(sessions).where(eq(sessions.userId, targetUserId));
          const keys = await redis.keys(`*${targetUserId}*`);
          for (const k of keys) {
            await redis.del(k);
          }
        } catch (revokeErr) {
          logger.warn({ revokeErr, targetUserId }, "Failed to revoke user sessions");
        }
      }


      // Invalidate permission cache
      await PermissionService.invalidateCache(targetUserId);

      // Record Audit Log
      await db
        .insert(auditLogs)
        .values({
          id: randomUUID(),
          adminId: adminUser.id,
          targetUserId: targetUserId,
          action: `SECURITY_${action.toUpperCase()}`,
          reason: reason,
          ipAddress: c.req.header("x-forwarded-for") || "unknown",
        })
        .catch((err) => logger.error({ err }, "Failed to persist audit log"));

      return c.json({
        success: true,
        message: `Security action '${action}' applied successfully to user ${targetUserId}.`,
      });
    } catch (err: any) {
      logger.error({ err: err.message }, "Security action failed");
      return c.json({ error: "Internal Server Error", message: "Failed to apply security action." }, 500);
    }
  }
}
