# Skill: Permission-Based Access Control (PBAC)

## 🎯 Purpose
Details the fine-grained permissions system governing the GrowMate Admin Suite, including registry definitions, middleware guards, and role assignment.

---

## 🏛️ 1. Architecture of PBAC in Anonna Mart
Instead of relying solely on coarse roles (`admin`, `user`), the GrowMate Admin Suite uses **granular, string-based permissions** grouped by domain modules:

```text
Database Schema:
roles ──< role_permissions >── permissions
  │
  └──< user_roles >── users
```

The system also supports direct user overrides via the `user_permissions` table.

---

## 📋 2. Canonical Permissions Registry
All permissions are centralized in `packages/db/src/permissions-registry.ts`:

| Module | Canonical Permission Key | Description |
| :--- | :--- | :--- |
| **Products** | `products:read` | Browse and view catalog items |
| | `products:create` | Create new catalog products |
| | `products:update` | Edit product metadata, pricing, stock |
| | `products:delete` | Soft or hard delete products |
| **Orders** | `orders:read` | View customer orders |
| | `orders:update` | Update order processing status |
| | `orders:cancel` | Cancel order and restore stock |
| **Coupons** | `coupons:read`, `coupons:create`, `coupons:delete` | Voucher management |
| **Settings** | `settings:read`, `settings:update` | Store configuration |
| **Analytics** | `analytics:read` | Financial and dashboard metrics |
| **Audit Logs** | `audit_logs:read` | Security and compliance logs |
| **Roles & Staff** | `roles:read`, `roles:assign`, `staff:manage` | Admin user management |

---

## 🛡️ 3. Guarding Endpoints with `requirePermission`

In any Hono route, import `requirePermission` and the `PERMISSIONS` object:

```ts
import { requirePermission } from "../../infra/middleware/require-permission";
import { PERMISSIONS } from "@growmate/db";

// Route protected by PBAC
route.patch(
  "/:id",
  requirePermission(PERMISSIONS.ORDERS_UPDATE),
  updateOrderHandler
);
```

### How the middleware evaluates access:
1. Validates the session cookie or authorization header using Better Auth.
2. Checks if the user is a `super_admin` (super admins bypass all permission checks).
3. Queries Redis cache for the user's computed permission set (TTL 10 mins).
4. If cached permissions exist, checks for the presence of the requested permission.
5. If cache misses, queries PostgreSQL for the user's role-based and direct permissions, caches the array in Redis, and permits or denies (`403 Forbidden`) the request.
