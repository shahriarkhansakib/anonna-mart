import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import postgres from "postgres";

// 1. Locate and load environment variables (.env.local or .env)
const candidatePaths = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../../apps/web/.env.local"),
  path.resolve(__dirname, "../../../apps/web/.env"),
  path.resolve(__dirname, "../../apps/web/.env.local"),
  path.resolve(__dirname, "../../apps/web/.env"),
  path.resolve(__dirname, "../web/.env.local"),
  path.resolve(__dirname, "../web/.env"),
];

for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    if (process.env.DATABASE_URL) break;
  }
}

const LOCAL_FALLBACK_URL = "postgresql://postgres:password@localhost:5434/anonna_mart";
const rawUrl = (process.env.DATABASE_URL || "").trim();
const databaseUrl = rawUrl || LOCAL_FALLBACK_URL;

async function resetDatabase() {
  const isNeon = databaseUrl.includes("neon.tech");
  const isSsl = isNeon || databaseUrl.includes("sslmode=require");

  // Parse connection info for safe logging (mask password)
  const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ":****@");
  console.log("\n=======================================================");
  console.log("🧨 DATABASE HARD RESET TRIGGERED");
  console.log(`Target: ${maskedUrl}`);
  console.log(`Mode:   ${isNeon ? "Neon Cloud Serverless" : "Standard PostgreSQL"}`);
  console.log("=======================================================\n");

  const sql = postgres(databaseUrl, {
    prepare: !isNeon,
    max: 1,
    connect_timeout: 10,
    ssl: isSsl ? "require" : undefined,
  });

  try {
    console.log("⏳ Dropping and recreating public schema...");
    await sql.unsafe(`DROP SCHEMA IF EXISTS public CASCADE;`);
    await sql.unsafe(`CREATE SCHEMA public;`);

    try {
      await sql.unsafe(`GRANT ALL ON SCHEMA public TO postgres;`);
      await sql.unsafe(`GRANT ALL ON SCHEMA public TO public;`);
    } catch {
      // Ignored on managed cloud databases with restricted superuser roles
    }

    console.log("✅ Public schema successfully wiped and recreated clean.");
    console.log("   (Cloudinary assets remain untouched on CDN)\n");
  } catch (err: any) {
    console.error("❌ Reset failed:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

resetDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
