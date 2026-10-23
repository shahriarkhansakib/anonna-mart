# ADR 0001: Deterministic Single Database Architecture

## Status
**Accepted & Enforced**

## Context
During early development, different components referenced varying database names:
* `growmate_db` (inherited from the base GrowMate engine template).
* `anonna-mart_db` (introduced with a hyphen during initial store scaffolding).
* `anonna_mart` (the production database created on Neon Serverless Postgres).

When `docker compose down -v` was executed, Docker initialized `POSTGRES_DB: growmate_db`, while Drizzle attempted to connect to `anonna-mart_db`. This triggered `PostgresError: database "anonna-mart_db" does not exist (code: 3D000)`. Additionally, raw SQL failed when referencing unquoted `anonna-mart_db` because PostgreSQL treats hyphens as subtraction operators.

An initial proposal attempted to create auto-provisioning scripts that created all three databases on container startup. However, having multiple database aliases created "ghost" databases, risked split-brain state, and obscured configuration errors.

## Decision
We chose a **strictly deterministic, single-database architecture**:
1. **Canonical Name:** The database is strictly named **`anonna_mart`** across all environments:
   * Local Docker Compose: `POSTGRES_DB: anonna_mart`.
   * Local connection string: `postgresql://postgres:password@localhost:5434/anonna_mart`.
   * Neon Cloud production: `...neon.tech/anonna_mart?sslmode=require`.
2. **Zero Magic:** Removed all dynamic database-creation wrappers.
3. **Explicit Developer Contract:** If a developer alters the database name in `DATABASE_URL`, they must explicitly update `docker-compose.yml` to match.
4. **Reliable Reset:** `pnpm db:reset` uses `docker compose up -d --wait` to guarantee container health before running migrations and seeds.

## Consequences
* **Positive:** Complete parity between local and cloud environments.
* **Positive:** Zero ghost databases in pgAdmin/TablePlus.
* **Positive:** Immediate, loud failure if configuration is mismatched, preventing silent data fragmentation.
