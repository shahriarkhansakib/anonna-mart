"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { getAuthUser, syncAuthSession, useAuth } from "@/contexts/AuthContext";
import { authClient, signIn } from "@/lib/auth-client";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already logged in, redirect directly to admin (if admin) or account/store
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === "admin" || user.role === "super_admin") {
        router.replace("/admin");
      } else if (
        redirectUrl &&
        redirectUrl !== "/" &&
        !redirectUrl.includes("sign-in") &&
        !redirectUrl.includes("login")
      ) {
        router.replace(redirectUrl);
      } else {
        router.replace("/account");
      }
    }
  }, [user, authLoading, router, redirectUrl]);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: redirectUrl && redirectUrl !== "/" ? redirectUrl : "/admin",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initialize Google sign-in.");
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await authClient.signIn.email({
        email: email.trim(),
        password,
      });

      if (res.error) {
        setErrorMsg(res.error.message || "Invalid email or password.");
        setLoading(false);
        return;
      }

      // Synchronize session and retrieve authenticated profile
      await syncAuthSession();
      const authUser = getAuthUser();
      const role = (res.data?.user as any)?.role || authUser?.role || "user";
      const isAdmin = role === "admin" || role === "super_admin";

      if (isAdmin) {
        toast.success("Welcome back!", { description: "Opening Store Admin Portal..." });
        if (
          redirectUrl &&
          redirectUrl !== "/" &&
          !redirectUrl.includes("sign-in") &&
          !redirectUrl.includes("login")
        ) {
          router.replace(redirectUrl);
        } else {
          router.replace("/admin");
        }
      } else {
        toast.success("Welcome back!", { description: "Successfully signed in." });
        if (
          redirectUrl &&
          redirectUrl !== "/" &&
          !redirectUrl.includes("sign-in") &&
          !redirectUrl.includes("login")
        ) {
          router.replace(redirectUrl);
        } else {
          router.replace("/account");
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to reach the sign-in service. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-7 sm:p-9 shadow-xl text-card-foreground transition-all">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
        Sign in to continue to your account.
      </p>

      {errorMsg && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive font-medium"
        >
          {errorMsg}
        </div>
      )}

      {/* Google Sign In Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading || loading}
        className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-card hover:bg-muted font-medium text-sm text-foreground transition-all shadow-2xs active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        <span>{googleLoading ? "Connecting with Google…" : "Continue with Google"}</span>
      </button>

      {/* Divider */}
      <div className="relative my-5 flex items-center justify-center">
        <div className="w-full border-t border-border" />
        <span className="absolute bg-card px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Or continue with email
        </span>
      </div>

      <form noValidate onSubmit={handleLogin} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground/80"
          >
            Email address
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@anonna.com"
            className="min-h-12 w-full rounded-xl border border-input bg-muted/40 px-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-emerald-600 focus:bg-background focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground/80"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
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

        <div className="flex justify-end pt-0.5">
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        New to Anonna Mart?{" "}
        <Link
          href={`/sign-up${redirectUrl !== "/" ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`}
          className="font-semibold text-emerald-600 dark:text-emerald-400 underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">
          Loading sign in…
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
