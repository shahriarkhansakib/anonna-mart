# Skill: Database Operations & Lifecycle Management

## 🎯 Purpose
Provides step-by-step procedures for managing PostgreSQL databases, executing deterministic resets, applying Drizzle schemas, seeding catalogs, and inspecting tables via Drizzle Studio.

---

## ⚡ 1. Deterministic Database Reset
When developing locally or recovering from schema inconsistencies across local Docker or Neon Cloud, execute:
```bash
pnpm.cmd db:reset
```

### What this command does:
1. `pnpm --filter @growmate/db reset`: Connects to `DATABASE_URL` (local or Neon Cloud) and safely wipes the `public` schema. Cloudinary CDN images are kept intact and never touched.
2. `pnpm db:push`: Applies all Drizzle ORM schema tables directly into the clean database.
3. `pnpm db:seed`: Seeds the standardized modular database suite:
   * 26 PBAC store permissions and default Admin accounts (`admin@anonna.com`)
   * Delivery logistics zones (Inside/Outside Dhaka)
   * Platform settings and configuration
   * 5 categories and 13 catalog products backed by Cloudinary CDN URLs
   * Promotional coupons, CMS articles, and demo customer profiles
   * Customer reconciliation, persistent notes, and store credit ledger

### Cloudinary Asset Management:
To upload local fixtures/raw images to Cloudinary and update the URL mapping:
```bash
pnpm.cmd db:seed:cloudinary
```

### Full Docker Daemon Hard Reset (Local Only):
If you specifically need to destroy and recreate the local Docker containers and volumes:
```bash
pnpm.cmd db:docker:reset
```

---

## 🛠️ 2. Applying Schema Changes (`db:push` vs `db:generate`)

### For Rapid Development & Local Testing (`db:push`)
To push schema changes directly to the database without generating SQL migration files:
```bash
pnpm.cmd db:push
```

### For Formal Production Migrations (`db:generate`)
To generate versioned SQL migration files under `packages/db/drizzle/`:
```bash
pnpm.cmd --filter @growmate/db generate
```

---

## 🔍 3. Inspecting the Database (Drizzle Studio)
To launch the visual Drizzle Studio web GUI:
```bash
pnpm.cmd db:studio
```
* **URL:** `https://local.drizzle.studio?port=5559`
* **Port:** `5559`
* **Invariant Note:** Drizzle Studio requires all `many()` relations to have an inverse `one()` relation with `fields` and `references` defined on the target table. If this rule is violated, Drizzle Studio will crash with `There is not enough information to infer relation`.

---

## 🔐 4. Default Seeded Accounts
After running `pnpm db:reset` or `pnpm db:seed`:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@anonna.com` | `12345678` | All 26 permissions |
| **Store Owner** | `khnayeam009@gmail.com` | `12345678` | All 26 permissions |
