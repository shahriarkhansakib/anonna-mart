import { auditLogs, db, sessions } from "@growmate/db";
import { eq, ne } from "drizzle-orm";
import type { Context } from "hono";
import { randomUUID } from "node:crypto";
import { logger } from "../../infra/lib/logger";
import { redis } from "../../infra/lib/redis";

export class SessionsController {
  static async listUserSessions(c: Context) {
    try {
      const userId = c.req.param("userId");
      if (!userId) {
        return c.json({ error: "Bad Request", message: "User ID required" }, 400);
      }

      const activeSessions = await db
        .select({
          id: sessions.id,
          ipAddress: sessions.ipAddress,
          userAgent: sessions.userAgent,
          expiresAt: sessions.expiresAt,
          createdAt: sessions.createdAt,
        })
        .from(sessions)
        .where(eq(sessions.userId, userId));

      return c.json({ success: true, data: activeSessions });
    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to list user sessions");
      return c.json({ error: "Internal Server Error" }, 500);
    }
  }

  static async revokeSession(c: Context) {
    try {
      const { sessionId } = await c.req.json();
      if (!sessionId) {
        return c.json({ error: "Bad Request", message: "Session ID required" }, 400);
      }

      await db.delete(sessions).where(eq(sessions.id, sessionId));
      return c.json({ success: true, message: "Session revoked successfully." });
    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to revoke session");
      return c.json({ error: "Internal Server Error" }, 500);
    }
  }

  static async nukeAllSessions(c: Context) {
    try {
      const adminUser = c.get("user") as any;
      if (!adminUser || adminUser.role !== "super_admin") {
        return c.json({ error: "Forbidden", message: "Super Admin privileges required." }, 403);
      }

      // Delete all sessions EXCEPT current super admin
      await db.delete(sessions).where(ne(sessions.userId, adminUser.id));

      // Invalidate Redis session keys
      try {
        const keys = await redis.keys("*session*");
        for (const k of keys) {
          await redis.del(k);
        }
      } catch {}

      // Audit log
      await db
        .insert(auditLogs)
        .values({
          id: randomUUID(),
          adminId: adminUser.id,
          targetUserId: adminUser.id,
          action: "GLOBAL_SESSION_NUKE",
          reason: "Emergency global session termination initiated by store super admin",
          ipAddress: c.req.header("x-forwarded-for") || "unknown",
        })
        .catch(() => {});

      return c.json({ success: true, message: "All store sessions globally terminated." });
    } catch (err: any) {
      logger.error({ err: err.message }, "Session nuke failed");
      return c.json({ error: "Internal Server Error" }, 500);
    }
  }
}
