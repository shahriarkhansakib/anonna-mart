# Anonna Mart — Modern E-Commerce Platform & GrowMate Admin Suite

[![Next.js 15](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-blue?logo=react)](https://react.dev/)
[![TypeScript 5.7](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.39-green?logo=drizzle)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql)](https://www.postgresql.org/)
[![Neon Database](https://img.shields.io/badge/Neon-Serverless_Postgres-00E599?logo=neon)](https://neon.tech/)
[![Upstash Redis](https://img.shields.io/badge/Upstash-Serverless_Redis-00E599?logo=upstash)](https://upstash.com/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444?logo=turborepo)](https://turbo.build/)
[![License: Private](https://img.shields.io/badge/License-Proprietary-red)](#)

An enterprise-grade, high-performance Bangladeshi e-commerce platform built for high concurrency and localized commerce operations. Powered by a unified Turborepo monorepo featuring a responsive consumer storefront (**Anonna Mart**) and a comprehensive store operations and analytics management suite (**GrowMate Admin Panel**).

---

## 🌟 Key Highlights & Features

### 🛍️ Anonna Mart Storefront
* **Localized Commerce:** Built specifically for Bangladesh with native Bangladeshi Taka (`৳ BDT`) currency formatting, district-aware delivery rates, Cash on Delivery (COD), and automated checkout calculations.
* **Modern Shopping Experience:** Instant category filtering, real-time product search, persistent shopping cart, customer address book, wishlist, order history, and coupon voucher discounts.
* **AI Support Assistant:** Floating intelligent customer support widget integrated via TokenHarbor AI Gateway with order context and catalog recommendations.
* **Authentication Suite:** Next-generation authentication powered by **Better Auth** with 1-click Google OAuth 2.0 Sign-In, secure email/password registration, password recovery, and session persistence.

### ⚡ GrowMate Admin Management Portal
* **Store Operations Command Center:** Real-time analytics, revenue tracking, pending actions, order fulfillment pipeline, and sales trends.
* **Product & Category Management:** Complete catalog CRUD, low-stock threshold alerts, SKU tracking, multi-image upload, and badge assignment.
* **Delivery & Logistics (Steadfast):** Multi-tier shipping zone management (Inside Dhaka Metro, Dhaka Suburbs, Nationwide 64 districts) and automated courier consignment dispatch.
* **Granular PBAC (Permission-Based Access Control):** 26 fine-grained permissions, custom store roles (Super Admin, Manager, Support, Auditor), and user audit trails.
* **Recovery & Incomplete Orders:** Abandoned cart tracking, customer re-engagement analytics, and return order lifecycle management.
* **CMS & Content Management:** Article, banner, and promotion editor with live preview.

---

## 🏗️ Architecture & Technology Stack

The project is structured as a modular **Turborepo** monorepo using **pnpm workspaces**:

```
growmate/
├── apps/
│   ├── api/                   # Hono v4 REST API (Sub-millisecond routing, PBAC, Courier)
│   └── web/                   # Next.js 15 App Router (Storefront, Admin UI, Better Auth)
├── packages/
│   ├── db/                    # Drizzle ORM schema, relations, migrations, seeders
│   └── type/                  # Shared TypeScript contracts, DTOs, and schemas
├── docker-compose.yml         # Local development environment (Postgres 16, Redis 7, Mailpit)
├── AGENTS.md                  # Comprehensive AI Agent System Instructions
└── .agents/                   # Agent Skills, Rules, and Architecture Decision Records (ADRs)
```

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/) |
| **Backend & API** | [Hono v4](https://hono.dev/) on Node / Edge, [Zod v3](https://zod.dev/) validation |
| **ORM & Database** | [Drizzle ORM](https://orm.drizzle.team/), [PostgreSQL 16](https://www.postgresql.org/) ([Neon](https://neon.tech/) in cloud, Docker locally) |
| **Caching & Rate-Limiting** | [Upstash Redis](https://upstash.com/) (HTTP REST API) with fallback to local Docker Redis |
| **Authentication** | [Better Auth v1.2](https://better-auth.com/) with Google OAuth 2.0 & Email Credentials |
| **Courier & Logistics** | [Steadfast Courier API](https://steadfast.com.bd/) webhook and consignment integration |
| **Transactional Email** | [Resend](https://resend.com/) in production / [Mailpit](https://github.com/axllent/mailpit) in local development |
| **AI Support Gateway** | [TokenHarbor AI](https://tokenharbor.ai/) Gateway (`mimo-v2.6-flash:free`) |
| **Build & Testing** | [Turborepo](https://turbo.build/), [pnpm v10](https://pnpm.io/), [Vitest](https://vitest.dev/) (17 test files, 65 tests) |

---

## 🔒 Deterministic Database Architecture

This repository enforces a **zero-magic, deterministic database contract**:

1. **Single Canonical Database Name:**
   The database name is strictly **`anonna_mart`** across the entire stack:
   * Local Docker: `POSTGRES_DB: anonna_mart` on port `5434`.
   * Cloud Production: Neon Serverless cluster database `anonna_mart`.
   * No split-brain aliases (`anonna-mart_db`, `growmate_db` are completely eliminated).
2. **Dual-Mode Cloud/Local Auto-Detection:**
   * **PostgreSQL:** If `DATABASE_URL` contains `neon.tech`, connection pooling (`prepare: false`) and SSL are automatically applied. If pointing to `localhost`, standard direct connections are used.
   * **Redis:** If `UPSTASH_URL` is set, Upstash REST client is used. If omitted or commented out, the app automatically falls back to local Docker Redis (`redis://127.0.0.1:6380`).
3. **Deterministic Reset:**
   Running `pnpm db:reset` tears down Docker volumes, awaits container health, applies Drizzle schema to `anonna_mart`, and seeds real catalog data deterministically.

---

## 🚀 Quick Start & Local Setup

### Prerequisites
* [Node.js 20.x or 22.x LTS](https://nodejs.org/)
* [pnpm v10+](https://pnpm.io/installation) (`npm install -g pnpm`)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local Postgres, Redis, and Mailpit)

### 1. Clone & Install Dependencies
```bash
git clone git@github.com:shahriarkhansakib/anonna-mart.git
cd anonna-mart
pnpm install
```

### 2. Configure Local Environment
Copy the example environment file:
```bash
cp apps/web/.env.example apps/web/.env.local
```
The default `apps/web/.env.local` is already configured for local Docker out-of-the-box:
```env
# Application URLs
PORT="5003"
NEXT_PUBLIC_APP_URL="http://localhost:5003"
NEXT_PUBLIC_API_URL="http://localhost:5003"

# Database (Local Docker)
DATABASE_URL="postgresql://postgres:password@localhost:5434/anonna_mart"

# Redis Cache (Local Docker)
REDIS_URL="redis://127.0.0.1:6380"

# Better Auth Secret & URL
BETTER_AUTH_SECRET="growmate-e2e-secret-key-32-characters-minimum-length"
BETTER_AUTH_URL="http://localhost:5003"
```

### 3. Initialize Database & Seed Catalog
Run the deterministic reset command to boot Docker containers, apply schema, and seed the full catalog:
```bash
# On Windows PowerShell, use pnpm.cmd
pnpm db:reset
```

> **Default Seeded Admin Credentials:**
> * Email: `admin@anonna.com`
> * Password: `password123` (or `12345678`)

### 4. Start Development Server
```bash
pnpm dev
```
Open your browser:
* **Storefront:** [http://localhost:5003](http://localhost:5003)
* **Admin Portal:** [http://localhost:5003/admin](http://localhost:5003/admin)
* **Mailpit (Email Catcher):** [http://localhost:8026](http://localhost:8026)
* **Drizzle Studio:** `pnpm db:studio` $\rightarrow$ [https://local.drizzle.studio?port=5559](https://local.drizzle.studio?port=5559)

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts all monorepo applications in watch mode via Turborepo |
| `pnpm build` | Compiles and builds all packages and applications for production |
| `pnpm test` | Runs the full Vitest test suite across all feature routes and stress tests |
| `pnpm typecheck` | Runs TypeScript strict type checking across all monorepo workspaces |
| `pnpm db:reset` | Tears down Docker volumes, boots fresh services, pushes schema, and seeds |
| `pnpm db:push` | Pushes current Drizzle schema directly to the database without migration files |
| `pnpm db:studio` | Launches Drizzle Studio GUI for visual database browsing on port `5559` |
| `pnpm db:seed` | Re-runs catalog and admin seeders against the active database |
| `pnpm format` | Formats the entire codebase using [Biome](https://biomejs.dev/) |
| `pnpm check` | Runs Biome linter, formatter, and import organizer checks |

---

## ☁️ Production Deployment (Vercel + Neon + Upstash)

This application is deployed and hosted on **Vercel** with custom domain routing for `anonnamartbd.com`.

### 1. Vercel Project Configuration
* **Framework Preset:** Next.js
* **Root Directory:** `./` (or `apps/web` with *Include source files outside Root Directory* enabled)
* **Build Command:** `turbo run build`
* **Output Directory:** `.next`

### 2. Required Production Environment Variables
Set these variables in **Vercel Dashboard $\rightarrow$ Settings $\rightarrow$ Environment Variables**:

```env
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://anonnamartbd.com"
NEXT_PUBLIC_API_URL="https://anonnamartbd.com"
BETTER_AUTH_URL="https://anonnamartbd.com"
BETTER_AUTH_SECRET="growmate-e2e-secret-key-32-characters-minimum-length"

# Cloud Neon Database
DATABASE_URL="postgresql://neondb_owner:npg_0uFGhyxZT5zU@ep-jolly-night-b4c3k7js-pooler.c-6.us-east-2.aws.neon.tech/anonna_mart?sslmode=require"

# Cloud Upstash Redis
UPSTASH_URL="https://integral-starfish-154910.upstash.io"
UPSTASH_TOKEN="gQAAAAAAAl0eAAIgcDFlOTg0ZmZjYmU0OTM0YTcxYWQ0NmU1MDFkMzYyMWMzMQ"

# Google Cloud OAuth 2.0
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Logistics & Email
RESEND_API_KEY="re_live_api_key"
STEADFAST_API_KEY="stf_live_api_key"
STEADFAST_SECRET_KEY="stf_secret_key"
```

### 3. Google Cloud OAuth Setup
In [Google Cloud Console $\rightarrow$ APIs & Services $\rightarrow$ Credentials](https://console.cloud.google.com/):
* **Authorized JavaScript Origins:**
  * `https://anonnamartbd.com`
  * `https://www.anonnamartbd.com`
* **Authorized Redirect URIs:**
  * `https://anonnamartbd.com/api/auth/callback/google`
  * `https://www.anonnamartbd.com/api/auth/callback/google`

---

## 🤖 Working with AI Agents

This repository is optimized for autonomous and collaborative pair-programming with AI Coding Agents (Claude, Cursor, Windsurf, Antigravity, Copilot).

* Consult [AGENTS.md](AGENTS.md) in the root directory for master agent rules, codebase index, architectural invariants, and verification workflows.
* Explore [.agents/](.agents/) for structured procedural **skills**, architectural **rules**, and Architecture Decision Records (**ADRs**).

---

## 📄 License

Proprietary and Confidential. Built by **GrowMate** for **Anonna Mart**. All rights reserved.
