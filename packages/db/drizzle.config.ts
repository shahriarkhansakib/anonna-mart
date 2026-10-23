import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// Search candidate env paths (apps/web/.env.local, root .env.local, etc.)
const candidatePaths = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../apps/web/.env.local"),
  path.resolve(__dirname, "../../apps/web/.env"),
  path.resolve(__dirname, "../../.env.local"),
  path.resolve(__dirname, "../../.env"),
];

for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    if (process.env.DATABASE_URL) break;
  }
}

const LOCAL_FALLBACK_URL = "postgresql://postgres:password@localhost:5434/anonna_mart";
const rawUrl = (process.env.DATABASE_URL || "").trim() || LOCAL_FALLBACK_URL;

// If connecting to Neon pooled URL, automatically derive the unpooled direct endpoint for migrations
const migrationUrl = rawUrl.includes("-pooler.") ? rawUrl.replace("-pooler.", ".") : rawUrl;

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
});
