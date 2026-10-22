"use client";

import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { authClient } from "@/lib/auth-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg("Missing or invalid password reset token. Please request a new link.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await (authClient as any).resetPassword({
        newPassword: password,
        token,
      });

      if (res?.error) {
        throw new Error(res.error.message || "Failed to reset password");
      }

      toast.success("Password reset successfully!", {
        description: "You can now sign in with your new password.",
      });

      router.replace("/sign-in");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-7 sm:p-9 shadow-xl text-card-foreground transition-all">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
        Security
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Set new password</h1>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
        Choose a strong password with at least 8 characters.
      </p>

      {errorMsg && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive font-medium"
        >
          {errorMsg}
        </div>
      )}

      <form noValidate onSubmit={handleReset} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="reset-new-password"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground/80"
          >
            New password
          </label>
          <div className="relative">
            <input
              id="reset-new-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="min-h-12 w-full rounded-xl border border-input bg-muted/40 px-3.5 pr-12 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-emerald-600 focus:bg-background focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((curr) => !curr)}
              className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="reset-confirm-password"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground/80"
          >
            Confirm new password
          </label>
          <input
            id="reset-confirm-password"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="min-h-12 w-full rounded-xl border border-input bg-muted/40 px-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-emerald-600 focus:bg-background focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
        >
          {loading ? "Updating password…" : "Update Password"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link
          href="/sign-in"
          className="font-semibold text-emerald-600 dark:text-emerald-400 underline-offset-4 hover:underline"
        >
          &larr; Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md px-4 sm:px-6 h-14 sm:h-16 flex items-center">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <Logo width={110} height={36} />

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/80 px-3 py-2 text-xs font-semibold text-foreground shadow-xs backdrop-blur-sm transition-all hover:bg-muted hover:border-emerald-600/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Go back to landing page</span>
              <span className="sm:hidden">Storefront</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <Suspense
            fallback={<div className="text-center text-muted-foreground text-sm">Loading…</div>}
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
