# Skill: Database Operations & Lifecycle Management

## 🎯 Purpose
Provides step-by-step procedures for managing PostgreSQL databases, executing deterministic resets, applying Drizzle schemas, seeding catalogs, and inspecting tables via Drizzle Studio.

---

## ⚡ 1. Deterministic Local Database Reset
When developing locally or recovering from schema inconsistencies, execute:
```bash
pnpm.cmd db:reset
```

### What this command does:
1. `docker compose down -v --remove-orphans`: Completely destroys the Docker containers and deletes the `growmate_pg_data` and `growmate_redis_data` volumes.
2. `docker compose up -d --wait`: Boots fresh PostgreSQL and Redis containers, waiting until PostgreSQL is healthy (`pg_isready -U postgres -d anonna_mart`).
3. `pnpm db:push`: Applies all Drizzle ORM schema tables directly into database `anonna_mart`.
4. `pnpm db:seed`: Seeds 5 product categories, 14 products, 3 delivery zones, 3 coupons, 26 PBAC permissions, and the default admin accounts.

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
