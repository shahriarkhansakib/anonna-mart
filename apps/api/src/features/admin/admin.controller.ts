import {
  auditLogs,
  db,
  orders,
  roles,
  userRoles,
  users,
} from "@growmate/db";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import type { Context } from "hono";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { logger } from "../../infra/lib/logger";
import { PermissionService } from "../permissions/permission.service";

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
});

export class AdminController {
  static async listUsers(c: Context) {
    try {
      const parsed = paginationSchema.safeParse(c.req.query());
      if (!parsed.success) {
        return c.json({ error: "Bad Request", details: parsed.error.format() }, 400);
      }

      const { page, limit, search, role, status } = parsed.data;
      const offset = (page - 1) * limit;

      const conditions: any[] = [];

      if (search) {
        conditions.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)));
      }
      if (role) {
        conditions.push(eq(users.role, role as any));
      }
      if (status) {
        conditions.push(eq(users.status, status as any));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;


      const [dataResult, countResult, allOrders] = await Promise.all([
        db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            status: users.status,
            phone: users.phone,
            address: users.address,
            division: users.division,
            district: users.district,
            banned: users.banned,
            banReason: users.banReason,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(users.createdAt)),
        db.select({ total: count() }).from(users).where(whereClause),
        db.select({ userId: orders.userId, totalAmount: orders.totalAmount }).from(orders),
      ]);

      const totalRecords = countResult[0]?.total || 0;
      const totalPages = Math.ceil(totalRecords / limit);

      // Aggregate orders per user
      const orderStats = new Map<string, { count: number; spend: number }>();
      for (const o of allOrders) {
        if (o.userId) {
          const prev = orderStats.get(o.userId) || { count: 0, spend: 0 };
          orderStats.set(o.userId, {
            count: prev.count + 1,
            spend: prev.spend + (o.totalAmount || 0),
          });
        }
      }

      const mappedUsers = dataResult.map((u) => {
        const stats = orderStats.get(u.id) || { count: 0, spend: 0 };
        return {
          ...u,
          user_id: u.id,
          full_name: u.name,
          orders_count: stats.count,
          total_spent: stats.spend,
          created_at: u.createdAt.toISOString(),
        };
      });

      return c.json({
        data: mappedUsers,
        users: mappedUsers,
        meta: {
          total: totalRecords,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to list users");
      return c.json({ error: "Internal Server Error" }, 500);
    }
  }

  static async getUserDetails(c: Context) {
    try {
      const id = c.req.param("id");
      if (!id) {
        return c.json({ error: "User ID is required" }, 400);
      }

      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }


      const userOrders = await db.select().from(orders).where(eq(orders.userId, id)).orderBy(desc(orders.createdAt));
      const totalSpent = userOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      // Fetch user's assigned store roles
      const userRoleMaps = await db.select().from(userRoles).where(eq(userRoles.userId, id));
      let assignedRoles: string[] = [];
      if (userRoleMaps.length > 0) {
        const roleRecords = await db.select().from(roles);
        assignedRoles = userRoleMaps
          .map((ur) => roleRecords.find((r) => r.id === ur.roleId)?.name)
          .filter(Boolean) as string[];
      }

      return c.json({
        success: true,
        data: {
          ...user,
          full_name: user.name,
          user_roles: assignedRoles.map((r) => ({ role: r })),
          roles: assignedRoles,
          orders_count: userOrders.length,
          total_spent: totalSpent,
          recent_orders: userOrders.slice(0, 5),
        },
      });
    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to fetch user details");
      return c.json({ error: "Internal Server Error" }, 500);
    }
  }

  static async listStaff(c: Context) {
    try {
      // Find all staff (users with role 'admin' or 'super_admin' or having store roles assigned)
      const allRoles = await db.select().from(roles);
      const allUserRoles = await db.select().from(userRoles);

      const staffUsers = await db
        .select()
        .from(users)
        .where(or(eq(users.role, "admin"), eq(users.role, "super_admin")));

      const staffWithRoles = staffUsers.map((staff) => {
        const assignedRoleIds = allUserRoles.filter((ur) => ur.userId === staff.id).map((ur) => ur.roleId);
        const assignedRoleNames = assignedRoleIds
          .map((rid) => allRoles.find((r) => r.id === rid)?.name)
          .filter(Boolean);

        return {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          systemRole: staff.role,
          status: staff.status,
          assignedRoles: assignedRoleNames,
          createdAt: staff.createdAt,
        };
      });

      return c.json({
        success: true,
        data: staffWithRoles,
        availableRoles: allRoles,
      });
    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to list staff");
      return c.json({ error: "Internal Server Error" }, 500);
    }
  }

  static async assignStaffRole(c: Context) {
    try {
      const { userId, roleName, systemRole } = await c.req.json();
      if (!userId) {
        return c.json({ error: "User ID required" }, 400);
      }

      // Elevate system role if provided
      if (systemRole && ["admin", "super_admin", "user"].includes(systemRole)) {
        await db.update(users).set({ role: systemRole }).where(eq(users.id, userId));
      }

      if (roleName) {
        const [targetRole] = await db.select().from(roles).where(eq(roles.name, roleName));
        if (!targetRole) {
          return c.json({ error: "Role not found" }, 404);
        }

        await db
          .insert(userRoles)
          .values({
            id: randomUUID(),
            userId,
            roleId: targetRole.id,
          })
          .onConflictDoNothing();
      }

      await PermissionService.invalidateCache(userId);

      return c.json({ success: true, message: `Role assigned successfully to user ${userId}` });
    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to assign staff role");
      return c.json({ error: "Internal Server Error" }, 500);
    }
  }

  static async removeStaffRole(c: Context) {
    try {
      const { userId, roleName } = await c.req.json();
      const [targetRole] = await db.select().from(roles).where(eq(roles.name, roleName));
      if (!targetRole) {
        return c.json({ error: "Role not found" }, 404);
      }

      await db
        .delete(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, targetRole.id)));

      await PermissionService.invalidateCache(userId);

      return c.json({ success: true, message: `Role ${roleName} removed from user ${userId}` });
    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to remove staff role");
      return c.json({ error: "Internal Server Error" }, 500);
    }
  }

  static async listAuditLogs(c: Context) {
    try {
      const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
      return c.json({ success: true, data: logs });
    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to list audit logs");
      return c.json({ error: "Internal Server Error" }, 500);
    }
  }
}
