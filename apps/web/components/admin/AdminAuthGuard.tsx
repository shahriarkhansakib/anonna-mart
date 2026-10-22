"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { Suspense, useEffect } from "react";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isStaff, isLoading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAdmin && !isStaff) {
      router.replace("/sign-in?redirect=/admin");
    }
  }, [isAdmin, isStaff, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Verifying GrowMate store staff authorization...</p>
      </div>
    );
  }

  if (!isAdmin && !isStaff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Access Restricted</h1>
        <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
          You must be logged in as an authorized store administrator or staff member to view this portal.
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
