import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

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

const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5434/growmate_db";

const client = postgres(DATABASE_URL);
export const db = drizzle(client, { schema });

export * from "./schema/index";
export * from "./permissions-registry";
export * from "drizzle-orm";
