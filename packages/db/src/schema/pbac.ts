import { boolean, index, pgTable, primaryKey, text, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./auth";

// 1. Global Store Permissions Registry Table
export const permissions = pgTable("permissions", {
  key: text("key").primaryKey(), // e.g. 'products:edit', 'orders:update_status'
  category: text("category").notNull(), // e.g. 'Products', 'Orders', 'Settings'
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

// 2. Store Roles (e.g. "Store Manager", "Order Manager", "Inventory Specialist")
export const roles = pgTable(
  "roles",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [unique("roles_name_unique").on(table.name)],
);

// 3. Role-to-Permission Mapping
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionKey: text("permission_key")
      .notNull()
      .references(() => permissions.key, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionKey] })],
);

// 4. User-to-Role Mapping (Staff Members to Store Roles)
export const userRoles = pgTable(
  "user_roles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    unique("user_roles_user_id_role_id_unique").on(table.userId, table.roleId),
    index("user_roles_user_id_idx").on(table.userId),
  ],
);

// 5. Individual Allow/Deny Permission Overrides for Staff
export const userPermissions = pgTable(
  "user_permissions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permissionKey: text("permission_key")
      .notNull()
      .references(() => permissions.key, { onDelete: "cascade" }),
    granted: boolean("granted").notNull(), // true = Allow Override, false = Deny Override
    assignedAt: timestamp("assigned_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    unique("user_permissions_user_id_perm_unique").on(table.userId, table.permissionKey),
    index("user_permissions_user_id_idx").on(table.userId),
  ],
);

export type Permission = typeof permissions.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
export type UserPermission = typeof userPermissions.$inferSelect;
