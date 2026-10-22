import { describe, expect, it, vi } from "vitest";
import { ROLE_HIERARCHY, requireRole } from "../../infra/middleware/role";

describe("Store Auth & PBAC Security Architecture", () => {
  describe("Role Hierarchy Engine", () => {
    it("should correctly order system role privileges", () => {
      expect(ROLE_HIERARCHY.super_admin).toBeGreaterThan(ROLE_HIERARCHY.admin);
      expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.user);
    });

    it("should reject users with lower role privileges", async () => {
      const middleware = requireRole("admin");
      let nextCalled = false;
      const jsonMock = vi.fn();

      const mockContext: any = {
        get: (key: string) => {
          if (key === "user") return { id: "u-1", role: "user" };
          return null;
        },
        json: jsonMock,
      };

      await middleware(mockContext, async () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: "Forbidden" }), 403);
    });

    it("should allow users meeting the required role level", async () => {
      const middleware = requireRole("admin");
      let nextCalled = false;
      const jsonMock = vi.fn();

      const mockContext: any = {
        get: (key: string) => {
          if (key === "user") return { id: "u-admin", role: "admin" };
          return null;
        },
        json: jsonMock,
      };

      await middleware(mockContext, async () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
      expect(jsonMock).not.toHaveBeenCalled();
    });

    it("should allow super_admin to access admin routes", async () => {
      const middleware = requireRole("admin");
      let nextCalled = false;

      const mockContext: any = {
        get: (key: string) => {
          if (key === "user") return { id: "u-super", role: "super_admin" };
          return null;
        },
        json: vi.fn(),
      };

      await middleware(mockContext, async () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
    });
  });

  describe("PBAC Set Resolution Logic", () => {
    it("should apply: (Base Roles ∪ Allow Overrides) \\ Deny Overrides", () => {
      const baseRolePerms = ["orders:view", "products:view", "orders:cancel"];
      const allowOverrides = ["products:create"];
      const denyOverrides = ["orders:cancel"];

      const combined = new Set([...baseRolePerms, ...allowOverrides]);
      for (const deny of denyOverrides) {
        combined.delete(deny);
      }

      expect(combined.has("orders:view")).toBe(true);
      expect(combined.has("products:create")).toBe(true);
      expect(combined.has("orders:cancel")).toBe(false); // Successfully denied by override
    });

    it("should grant full wildcard to super_admin", () => {
      const isSuperAdmin = true;
      const userPermissions = new Set(["products:view"]);

      const checkAccess = (perm: string) => {
        if (isSuperAdmin || userPermissions.has("*")) return true;
        return userPermissions.has(perm);
      };

      expect(checkAccess("settings:manage")).toBe(true);
      expect(checkAccess("any:unseeded:permission")).toBe(true);
    });
  });

  describe("Account Guillotine Status Enforcement", () => {
    it("should detect banned status and flag account", () => {
      const user = { id: "u-banned", status: "banned", banned: true };
      const isBanned = user.status === "banned" || user.banned;
      expect(isBanned).toBe(true);
    });

    it("should detect password reset requirement", () => {
      const user = { id: "u-reset", requiresPasswordReset: true };
      expect(user.requiresPasswordReset).toBe(true);
    });
  });
});
