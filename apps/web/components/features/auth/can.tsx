"use client";

import type { AppPermission } from "@growmate/db";
import { ReactNode } from "react";
import { usePermissionStore } from "@/store/use-permission-store";

interface CanProps {
  I: AppPermission | AppPermission[];
  children: ReactNode;
  fallback?: ReactNode;
  not?: boolean;
}

export function Can({ I, children, fallback = null, not = false }: CanProps) {
  const { can, canAny, isLoaded } = usePermissionStore();

  // Prevent UI flashing while permissions are hydrating
  if (!isLoaded) return null;

  const hasAccess = Array.isArray(I) ? canAny(I) : can(I);
  const hasPermission = not ? !hasAccess : hasAccess;

  if (hasPermission) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
