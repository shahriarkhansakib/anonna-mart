"use client";

import { Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { Suspense, useEffect, useRef } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useUserRole } from "@/hooks/useUserRole";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isStaff, isLoading } = useUserRole();
  const router = useRouter();
  // Track whether we previously had valid access to avoid flashing the
  // "Access Restricted" screen during a sign-out transition where isLoading
  // briefly becomes false before the redirect fires.
  const hadAccess = useRef(false);

  if (!isLoading && (isAdmin || isStaff)) {
    hadAccess.current = true;
  }

  useEffect(() => {
    if (!isLoading && !isAdmin && !isStaff) {
      router.replace("/sign-in?redirect=/admin");
    }
  }, [isAdmin, isStaff, isLoading, router]);

  // Show spinner while loading OR while we're navigating away after losing access
  if (isLoading || (!isAdmin && !isStaff && hadAccess.current)) {
    return (
      <div
        className="admin-shell min-h-screen flex flex-col items-center justify-center bg-background gap-3"
        data-admin="true"
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">
          Verifying GrowMate store staff authorization...
        </p>
      </div>
    );
  }

  if (!isAdmin && !isStaff) {
    return (
      <div
        className="admin-shell min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center"
        data-admin="true"
      >
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Access Restricted</h1>
        <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
          You must be logged in as an authorized store administrator or staff member to view this
          portal.
        </p>
        <Link
          href="/sign-in?redirect=/admin"
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90"
        >
          Sign In with Admin Account
        </Link>
      </div>
    );
  }

  return (
    <AdminShell>
      <Suspense fallback={null}>{children}</Suspense>
    </AdminShell>
  );
}
