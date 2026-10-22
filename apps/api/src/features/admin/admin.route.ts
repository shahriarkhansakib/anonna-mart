import { Hono } from "hono";
import { requireAuth } from "../../infra/middleware/auth";
import { requireRole } from "../../infra/middleware/role";
import { AdminController } from "./admin.controller";
import { SecurityController } from "./security.controller";
import { SessionsController } from "./sessions.controller";

export const adminRouter = new Hono();

// All admin routes require an active session and at least 'admin' system privileges
adminRouter.use("/*", requireAuth, requireRole("admin"));

// User & Customer Management
adminRouter.get("/users", AdminController.listUsers);
adminRouter.get("/users/:id", AdminController.getUserDetails);

// Security Actions (Ban, Suspend, Password Reset, Reset MFA)
adminRouter.post("/security-action", SecurityController.enforceSecurityAction);

// Session Inspection & Revocation
adminRouter.get("/users/:userId/sessions", SessionsController.listUserSessions);
adminRouter.post("/sessions/revoke", SessionsController.revokeSession);
adminRouter.post("/sessions/nuke", requireRole("super_admin"), SessionsController.nukeAllSessions);

// Staff & Role PBAC Management
adminRouter.get("/staff", AdminController.listStaff);
adminRouter.post("/staff/role", requireRole("super_admin"), AdminController.assignStaffRole);
adminRouter.delete("/staff/role", requireRole("super_admin"), AdminController.removeStaffRole);

// SOC2 & Security Audit Trail
adminRouter.get("/audit-logs", AdminController.listAuditLogs);
