import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import * as schema from "./schema/index";

// Locate .env.local if DATABASE_URL is not already in process.env
if (!process.env.DATABASE_URL) {
  const candidatePaths = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(__dirname, "../../apps/web/.env.local"),
    path.resolve(__dirname, "../../apps/web/.env"),
    path.resolve(__dirname, "../web/.env.local"),
    path.resolve(__dirname, "../../../apps/web/.env.local"),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      if (process.env.DATABASE_URL) break;
    }
  }
}

const LOCAL_FALLBACK_URL = "postgresql://postgres:password@localhost:5434/anonna_mart";
const rawUrl = (process.env.DATABASE_URL || "").trim();
const DATABASE_URL = rawUrl || LOCAL_FALLBACK_URL;
const isProd = process.env.NODE_ENV === "production";

function createDb() {
  const postgres = require("postgres");
  const { drizzle: drizzlePostgres } = require("drizzle-orm/postgres-js");

  // When connecting to Neon database or SSL-enabled Postgres:
  // Neon pgBouncer pooler (-pooler.xxx.neon.tech) requires prepare: false
  const isNeon = DATABASE_URL.includes("neon.tech");
  const isSsl = isNeon || DATABASE_URL.includes("sslmode=require");

  const client = postgres(DATABASE_URL, {
    prepare: !isNeon,
    max: isProd ? 1 : 10,
    idle_timeout: 20,
    connect_timeout: isProd ? 15 : 6,
    ssl: isSsl ? "require" : undefined,
  });

  return drizzlePostgres(client, { schema });
}

export const db = createDb();

export * from "drizzle-orm";
export * from "./permissions-registry";
export * from "./schema/index";
