import type { AppPermission } from "@growmate/db";
import { create } from "zustand";

interface PermissionState {
  permissions: string[];
  systemRole: string | null;
  roles: string[];
  isSuperAdmin: boolean;
  isLoaded: boolean;

  // Actions
  loadPermissions: () => Promise<void>;
  clearPermissions: () => void;

  // Evaluators
  can: (permission: AppPermission | string) => boolean;
  canAny: (permissions: (AppPermission | string)[]) => boolean;
  canAll: (permissions: (AppPermission | string)[]) => boolean;
  hasRole: (allowedRoleNames?: string[]) => boolean;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: [],
  systemRole: null,
  roles: [],
  isSuperAdmin: false,
  isLoaded: false,

  loadPermissions: async () => {
    try {
      const res = await fetch("/api/permissions/me", {
        credentials: "include",
      });

      if (res.ok) {
        const body = await res.json();
        const data = body.data || {};
        set({
          permissions: data.permissions || [],
          systemRole: data.systemRole || null,
          roles: data.roles || [],
          isSuperAdmin: !!data.isSuperAdmin,
          isLoaded: true,
        });
      } else {
        set({ permissions: [], systemRole: null, roles: [], isSuperAdmin: false, isLoaded: true });
      }
    } catch {
      set({ permissions: [], systemRole: null, roles: [], isSuperAdmin: false, isLoaded: true });
    }
  },

  clearPermissions: () =>
    set({ permissions: [], systemRole: null, roles: [], isSuperAdmin: false, isLoaded: true }),

  can: (permission: string) => {
    const { permissions, isSuperAdmin } = get();
    if (isSuperAdmin || permissions.includes("*")) return true;
    return permissions.includes(permission);
  },

  canAny: (checkPermissions: string[]) => {
    const { permissions, isSuperAdmin } = get();
    if (isSuperAdmin || permissions.includes("*")) return true;
    return checkPermissions.some((p) => permissions.includes(p));
  },

  canAll: (checkPermissions: string[]) => {
    const { permissions, isSuperAdmin } = get();
    if (isSuperAdmin || permissions.includes("*")) return true;
    return checkPermissions.every((p) => permissions.includes(p));
  },

  hasRole: (allowedRoleNames?: string[]) => {
    const { isSuperAdmin, roles } = get();
    if (isSuperAdmin) return true;
    if (!allowedRoleNames || allowedRoleNames.length === 0) return true;
    return allowedRoleNames.some((r) => roles.includes(r));
  },
}));
