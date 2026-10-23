# AGENTS.md — Master AI Coding Agent Instructions

> **Audience:** Autonomous AI coding agents (Antigravity, Claude Code, Cursor, Windsurf, GitHub Copilot Workspace, Codex).  
> **Repository:** `anonna-mart` (Monorepo: Anonna Mart Storefront + GrowMate Admin Suite)  
> **Maintainer:** GrowMate Engineering Team  
> **Last Updated:** October 2026

---

## 🎯 1. Mission & System Overview

You are working on the production codebase for **Anonna Mart**, an enterprise Bangladeshi e-commerce platform with an integrated **GrowMate Admin Suite**. 

The repository is organized as a high-performance **Turborepo** monorepo:
* **`apps/web`**: Next.js 15 (App Router, React 19, Tailwind CSS v4, Radix UI). Hosts the customer storefront (`/`) and the GrowMate admin portal (`/admin`).
* **`apps/api`**: Hono v4 backend embedded under `/api` and available standalone. Handles order processing, PBAC authentication, Steadfast courier logistics, analytics, and AI support.
* **`packages/db`**: Drizzle ORM schema, relations, seeders, and migration tooling.
* **`packages/type`**: Shared TypeScript contracts, DTOs, and domain schemas.

---

## ⚠️ 2. Non-Negotiable Architectural Invariants (DO NOT BREAK)

### 🔴 Invariant 1: Single Canonical Database Name (`anonna_mart`)
* The local Docker database and the Neon Cloud database are **both named `anonna_mart`**.
* **NEVER** introduce alternative database names (`anonna-mart_db`, `growmate_db`, etc.).
* **NEVER** write dynamic scripts to create fallback databases on the fly.
* If a database setting is changed, it must be explicitly updated in `docker-compose.yml` (`POSTGRES_DB: anonna_mart`) and `.env.local`.

### 🔴 Invariant 2: Zero-Config Dual Mode (Cloud vs Local)
* Database connection logic in `packages/db/src/index.ts` automatically detects Neon when `neon.tech` is present in `DATABASE_URL` (enabling SSL and pgBouncer pooling settings).
* Redis client in `apps/api/src/infra/lib/redis.ts` automatically uses Upstash REST API if `UPSTASH_URL` is set, and silently falls back to local Docker Redis (`redis://127.0.0.1:6380`) if omitted.
* **DO NOT** add configuration flags like `USE_LOCAL_SERVICES`, `LOCAL_DATABASE_URL`, or `DATABASE_URL_UNPOOLED`.

### 🔴 Invariant 3: Drizzle Relation Pairing Rule
* In Drizzle ORM, every `many()` relation defined on a table **MUST** have a corresponding `one()` relation on the referenced table with explicit `fields` and `references`:
  ```ts
  // Table A:
  export const parentRelations = relations(parent, ({ many }) => ({
    children: many(child),
  }));

  // Table B (MANDATORY, or Drizzle Studio crashes!):
  export const childRelations = relations(child, ({ one }) => ({
    parent: one(parent, {
      fields: [child.parentId],
      references: [parent.id],
    }),
  }));
  ```

### 🔴 Invariant 4: Windows PowerShell Command Execution
* The host environment is **Windows PowerShell**.
* Direct commands like `pnpm` or `npx` may be blocked by PowerShell's `ExecutionPolicy`.
* **ALWAYS execute `pnpm.cmd` and `npx.cmd`** in command-line tool calls (e.g., `pnpm.cmd test`, `pnpm.cmd db:reset`).

### 🔴 Invariant 5: Port Allocations
* **Frontend Web & API**: `5003` (`http://localhost:5003`)
* **Local PostgreSQL**: `5434` (mapped to container `5432`)
* **Local Redis**: `6380` (mapped to container `6379`)
* **Local Mailpit**: `1026` (SMTP) / `8026` (Web UI)
* **Drizzle Studio**: `5559` (`https://local.drizzle.studio?port=5559`)

### 🔴 Invariant 6: Co-Branding Integrity
* **Storefront (`/`)**: Brand identity is **Anonna Mart** (emerald green accents, warm parchment backgrounds, Bengali e-commerce styling).
* **Admin Portal (`/admin`)**: Dual co-branding is **GrowMate Admin Panel** for store management, with GrowMate partner badge and Electric Blue (`hsl(211, 100%, 50%)`) theme tokens.
* **Admin Metadata**: Favicon and title tags under `/admin` must reflect `GrowMate Admin Panel — Anonna Mart`.

---

## 🗺️ 3. Codebase Directory Map

```text
growmate/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── features/               # Domain feature modules
│   │   │   │   ├── admin/              # Staff management, sessions, audit
│   │   │   │   ├── analytics/          # Sales metrics, revenue, charts
│   │   │   │   ├── auth/               # Better Auth hooks and session proxy
│   │   │   │   ├── cms/                # Article & banner management
│   │   │   │   ├── coupons/            # Voucher validation and logic
│   │   │   │   ├── courier/            # Steadfast courier consignment webhooks
│   │   │   │   ├── delivery-zones/     # Inside/Outside Dhaka logistics rules
│   │   │   │   ├── incomplete-orders/  # Abandoned cart recovery
│   │   │   │   ├── orders/             # Order creation, status pipeline, COD
│   │   │   │   ├── permissions/        # PBAC permission query endpoints
│   │   │   │   ├── products/           # Catalog CRUD, search, variants
│   │   │   │   ├── returns/            # Return requests & refund lifecycle
│   │   │   │   ├── settings/           # Store-wide configuration & maintenance
│   │   │   │   ├── stress/             # Concurrency & load test suites
│   │   │   │   ├── support/            # TokenHarbor AI customer support agent
│   │   │   │   ├── system/             # Health check & uptime monitors
│   │   │   │   └── users/              # Customer profile & address management
│   │   │   ├── infra/
│   │   │   │   ├── lib/                # Auth, logger, redis instances
│   │   │   │   └── middleware/         # Auth, PBAC, rate-limiting, roles
│   │   │   ├── server.ts               # Hono app entry and route mounting
│   │   │   └── env.ts                  # Runtime environment validation
│   └── web/
│       ├── app/
│       │   ├── (auth)/                 # Sign-in, sign-up, Google OAuth pages
│       │   ├── account/                # Customer account, orders, addresses
│       │   ├── admin/                  # GrowMate Admin Portal routes
│       │   ├── api/                    # Route handlers delegating to Hono API
│       │   ├── checkout/               # Multi-step checkout with Steadfast zones
│       │   └── globals.css             # Tailwind v4 theme definitions
│       ├── components/
│       │   ├── admin/                  # AdminShell, AdminSidebar, AdminHeader
│       │   ├── common/                 # Header, Footer, ThemeToggle, Logo
│       │   ├── storefront/             # AIChatWidget, ProductCard, CartDrawer
│       │   └── ui/                     # Radix UI primitive components
│       └── middleware.ts               # Lightweight edge cookie session router
└── packages/
    ├── db/
    │   ├── src/
    │   │   ├── schema/                 # Drizzle pgTable & relations definitions
    │   │   ├── permissions-registry.ts # Canonical 26 store PBAC permissions
    │   │   ├── seed.ts                 # Real Anonna Mart catalog seed
    │   │   └── index.ts                # Drizzle client factory
    │   └── drizzle.config.ts           # Drizzle Kit CLI configuration
    └── type/
        └── src/                        # Shared TypeScript interfaces & types
```

---

## 🛠️ 4. Standard Agent Workflows

### Task A: Modifying or Adding Database Schema
1. Define table and columns in `packages/db/src/schema/<feature>.ts`.
2. **Always pair relations:** If table has `many()`, define the matching `one()` relation with `fields` and `references`.
3. Export the new schema in `packages/db/src/schema/index.ts`.
4. Run `pnpm.cmd db:push` to apply changes directly to the local database.
5. If new seed data is required, update `packages/db/src/seed.ts` and test with `pnpm.cmd db:seed`.

### Task B: Creating a New API Endpoint
1. Create route under `apps/api/src/features/<feature>/<feature>.route.ts`.
2. Validate incoming input using Zod schemas via `@hono/zod-validator`.
3. Protect admin routes using PBAC middleware:
   ```ts
   route.post("/", requirePermission(PERMISSIONS.PRODUCTS_CREATE), async (c) => { ... });
   ```
4. Mount the route in `apps/api/src/server.ts`.
5. Add unit and integration tests in `apps/api/src/features/<feature>/<feature>.test.ts`.

### Task C: Verification Checklist Before Completing Tasks
Every code change must be validated using these three commands:
```bash
# 1. Run all API tests (must pass 100%)
pnpm.cmd --filter @growmate/api test

# 2. Run TypeScript strict typecheck across all workspaces
pnpm.cmd --filter @growmate/web typecheck
pnpm.cmd --filter @growmate/db typecheck

# 3. Format and lint checks
pnpm.cmd format
```

---

## 📚 5. Deep-Dive Agent Resources (`.agents/`)

For granular procedural skills and architecture rules, refer to:
* **Procedural Skills:** [`.agents/skills/`](.agents/skills/)
  * [`database-operations.md`](.agents/skills/database-operations.md): Resetting, migrating, and seeding.
  * [`api-development.md`](.agents/skills/api-development.md): Step-by-step Hono endpoint blueprint.
  * [`testing-and-qa.md`](.agents/skills/testing-and-qa.md): Writing robust tests and stress tests.
  * [`admin-pbac-permissions.md`](.agents/skills/admin-pbac-permissions.md): Permission registry and PBAC.
* **Architecture Rules:** [`.agents/rules/`](.agents/rules/)
  * [`architecture-and-code-style.md`](.agents/rules/architecture-and-code-style.md): Clean code standards.
  * [`database-conventions.md`](.agents/rules/database-conventions.md): Schema design and query rules.
  * [`security-and-credentials.md`](.agents/rules/security-and-credentials.md): Auth, secrets, and sanitization.
  * [`ui-and-branding.md`](.agents/rules/ui-and-branding.md): Dual-branding, themes, and design tokens.
* **Architecture Decision Records (ADRs):** [`.agents/decisions/`](.agents/decisions/)
  * [`0001-deterministic-single-database-architecture.md`](.agents/decisions/0001-deterministic-single-database-architecture.md)
  * [`0002-dual-mode-cloud-and-local-redis-db.md`](.agents/decisions/0002-dual-mode-cloud-and-local-redis-db.md)
  * [`0003-unified-admin-and-store-branding.md`](.agents/decisions/0003-unified-admin-and-store-branding.md)
  * [`0004-monorepo-structure-and-routing.md`](.agents/decisions/0004-monorepo-structure-and-routing.md)
