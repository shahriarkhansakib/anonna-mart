import { useAuth } from "@/contexts/AuthContext";
import { usePermissionStore } from "@/store/use-permission-store";

export type UserRoleType = "user" | "admin" | "super_admin";

interface UserRoleData {
  roles: string[];
  primaryRole: UserRoleType;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isUser: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isStaff: boolean;
  // Deprecated compatibility flags
  isDoctor: boolean;
  isClinicOwner: boolean;
  refetch: () => void;
}

export const useUserRole = (): UserRoleData => {
  const { user, loading: authLoading } = useAuth();
  const { roles, isSuperAdmin, isLoaded, loadPermissions } = usePermissionStore();

  const userRole = (user?.role as UserRoleType) || "user";
  const isAdmin = userRole === "admin" || userRole === "super_admin" || isSuperAdmin;
  const isStaff = isAdmin || roles.length > 0;

  return {
    roles: roles.length > 0 ? roles : [userRole],
    primaryRole: userRole,
    isLoading: authLoading || (!!user && !isLoaded),
    isError: false,
    error: null,
    isUser: userRole === "user",
    isAdmin,
    isSuperAdmin,
    isStaff,
    isDoctor: false,
    isClinicOwner: false,
    refetch: loadPermissions,
  };
};
