# Rule: Architecture & Code Style Guidelines

## 🎯 Purpose
Defines architectural boundaries, directory conventions, and coding style requirements to maintain codebase health, maintainability, and clarity.

---

## 🏛️ 1. Monorepo Separation of Concerns

* **`apps/web`:** Presentation, layout, pages, and UI client interactions. **Never import directly from database driver libraries (`postgres`, `pg`) in React client components.**
* **`apps/api`:** Business logic, database querying, external API integrations (Steadfast, Resend, TokenHarbor), and authentication validation.
* **`packages/db`:** Schema definitions, relations, seeders, and migration config.
* **`packages/type`:** Pure TypeScript types, DTO interfaces, and shared data contracts. No heavy runtime dependencies.

---

## 💅 2. Formatting & Code Quality (Biome)
* We use [Biome](https://biomejs.dev/) as our primary linter and formatter.
* Run `pnpm.cmd format` before finalizing commits.
* Preserve existing comments and docstrings.
* Use explicit TypeScript typing. Avoid `any` unless required for complex third-party SDK interop.

---

## ⚡ 3. Next.js 15 Client vs Server Components
* Mark interactive UI components with `"use client"` at the top of the file when using hooks (`useState`, `useEffect`, `useQuery`, Framer Motion).
* Keep layout pages and data-fetching containers as Server Components where possible.
* Do not perform long-running blocking network calls inside Next.js edge middleware. `apps/web/middleware.ts` is strictly for fast cookie-presence routing.
