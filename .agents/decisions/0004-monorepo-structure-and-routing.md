# ADR 0004: Monorepo Structure & Embedded Hono Routing

## Status
**Accepted & Enforced**

## Context
A full-stack e-commerce solution requires:
1. Fast server-side rendering and client UX (Next.js 15 App Router).
2. Ultra-low latency API endpoints, streaming responses, and webhook handlers for courier services (Hono v4).
3. Shared database schema and type definitions across frontend and backend.

Running separate backend and frontend servers in production increases hosting costs, complicates SSL certificates, and introduces CORS overhead.

## Decision
1. **Turborepo Monorepo:** Structured using `pnpm` workspaces:
   * `apps/web`: Next.js 15 App Router.
   * `apps/api`: Hono v4 API.
   * `packages/db`: Drizzle ORM schema and migrations.
   * `packages/type`: Shared TypeScript models.
2. **Embedded Hono Dispatch in Next.js:** In Next.js, `apps/web/app/api/[[...route]]/route.ts` delegates requests directly to the Hono `app.fetch` handler.
3. **Standalone Capability:** `apps/api` can also be run independently (`pnpm dev:standalone`) using `@hono/node-server` if required for specialized background workers.

## Consequences
* **Positive:** Single deployment target on Vercel with zero CORS issues.
* **Positive:** Shared TypeScript types guarantee compile-time safety between frontend components and backend routes.
* **Positive:** Sub-millisecond internal routing performance.
