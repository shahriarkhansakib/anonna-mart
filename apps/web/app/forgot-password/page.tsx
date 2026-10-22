"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await (authClient as any).forgetPassword({
        email: email.trim(),
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (res?.error) {
        throw new Error(res.error.message || "Failed to send reset link");
      }

      setSent(true);
      toast.success("Password reset link sent to your email!");
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to send password reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      {/* Top Header with Logo on Top-Left and "Go back to landing page" on Right */}
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

      {/* Centered Auth Card */}
      <main className="flex-1 flex items-center justify-center p-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-7 sm:p-9 shadow-xl text-card-foreground transition-all">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Account help
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              Forgot your password?
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {sent
                ? "We have dispatched a password recovery link to your inbox."
                : "Enter your account email address and we will send you a link to reset your password."}
            </p>

            {errorMsg && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive font-medium"
              >
                {errorMsg}
              </div>
            )}

            {sent ? (
              <div className="mt-6 rounded-xl border border-emerald-600/30 bg-emerald-500/10 p-5 text-center space-y-3">
                <p className="text-sm text-foreground">
                  A reset link was sent to{" "}
                  <strong className="text-emerald-700 dark:text-emerald-300 font-bold">
                    {email}
                  </strong>
                  .
                </p>
                <p className="text-xs text-muted-foreground">
                  Didn&apos;t receive the email? Check your spam folder or{" "}
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="text-emerald-600 dark:text-emerald-400 underline-offset-4 hover:underline font-semibold"
                  >
                    try again
                  </button>
                  .
                </p>
              </div>
            ) : (
              <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground/80"
                  >
                    Email address
                  </label>
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@example.com"
                    className="min-h-12 w-full rounded-xl border border-input bg-muted/40 px-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-emerald-600 focus:bg-background focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
                >
                  {loading ? "Sending link…" : "Send Reset Link"}
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-xs text-muted-foreground">
              <Link
                href="/sign-in"
                className="font-semibold text-emerald-600 dark:text-emerald-400 underline-offset-4 hover:underline"
              >
                &larr; Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
