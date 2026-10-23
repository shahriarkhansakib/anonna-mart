# Rule: Security, Authentication & Credential Hygiene

## 🎯 Purpose
Governs user authentication (Better Auth), session validation, environment variable hygiene, and API credential protection.

---

## 🔒 1. Credential & Environment Variable Hygiene
* **Never commit `.env.local` or `.env` files.**
* All secret keys (`BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `STEADFAST_API_KEY`, `RESEND_API_KEY`) must only exist in untracked `.env.local` files or in the Vercel Production Environment Variables console.
* Keep `apps/web/.env.example` clean of production credentials with placeholder defaults.

---

## 🛡️ 2. Better Auth & Session Handling
* Better Auth is the sole authority for password hashing, user registration, and OAuth 2.0 flows.
* Storefront sessions and Admin sessions use standard secure cookies (`better-auth.session_token`).
* Edge middleware (`apps/web/middleware.ts`) checks for the presence of the session token cookie before allowing requests to reach `/admin` or `/account`.
* Detailed authorization checks and role verification are enforced on the backend Hono API via `requirePermission()` and `authMiddleware`.

---

## 🛑 3. Account Status & Password Resets
* Banned or suspended accounts must be blocked immediately from performing actions.
* The API returns HTTP `403 Forbidden` if an active session belongs to a user with `status === "banned"` or `status === "suspended"`.
* If `requiresPasswordReset === true`, the customer must be redirected to `/reset-password` before proceeding with orders or account changes.
