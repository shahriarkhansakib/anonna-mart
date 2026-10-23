# ADR 0002: Zero-Config Dual-Mode Cloud & Local Redis/DB

## Status
**Accepted & Enforced**

## Context
Developers need to seamlessly switch between:
1. Pure local offline development with Docker containers (`localhost:5434` for Postgres, `localhost:6380` for Redis).
2. Cloud serverless staging/production using Neon PostgreSQL and Upstash Redis REST.

Previously, projects often introduced clunky environment flags like `USE_LOCAL_SERVICES="true"`, `LOCAL_DATABASE_URL`, and separate `DATABASE_URL_UNPOOLED` migration endpoints. This polluted `.env` files and caused confusion during Vercel deployment.

## Decision
We implemented **smart connection detection** using single, standard environment variables:

1. **Database (`DATABASE_URL`):**
   * If the connection string contains `neon.tech`, Drizzle enables SSL (`sslmode=require`) and configures pgBouncer pooling compatibility (`prepare: false`).
   * When running migrations (`drizzle.config.ts`), any `-pooler.` endpoint is automatically stripped to connect directly to the Neon unpooled compute instance without needing a second `DATABASE_URL_UNPOOLED` variable.
   * If pointing to `localhost`, standard direct TCP connections are used without SSL.

2. **Redis (`UPSTASH_URL` & `REDIS_URL`):**
   * The Redis factory in `apps/api/src/infra/lib/redis.ts` checks if `UPSTASH_URL` and `UPSTASH_TOKEN` are present. If so, it returns an `@upstash/redis` HTTP REST client (ideal for serverless functions).
   * If omitted, it automatically falls back to an `ioredis` TCP client connecting to `REDIS_URL="redis://127.0.0.1:6380"`.

## Consequences
* **Positive:** Only two clean variables needed in Vercel: `DATABASE_URL` and `UPSTASH_URL`.
* **Positive:** Zero code changes or flag toggling required when moving from local to cloud.
* **Positive:** Complete elimination of redundant, confusing environment variables.
