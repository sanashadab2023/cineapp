import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

export async function runMigrations(customPool?: Pool) {
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    "postgres://localhost:5432/cinebook";

  const pool =
    customPool ||
    new Pool({
      connectionString,
      ssl:
        connectionString.includes("neon.tech") || connectionString.includes("sslmode=require")
          ? { rejectUnauthorized: false }
          : undefined,
    });

  const client = await pool.connect();
  try {
    console.log("🚀 Running CineBook database migrations...");

    // Find all .sql files in drizzle directory
    const drizzleDir = path.join(process.cwd(), "drizzle");
    if (!fs.existsSync(drizzleDir)) {
      console.warn("⚠️ No drizzle directory found. Skipping migration run.");
      return;
    }

    const migrationFiles = fs
      .readdirSync(drizzleDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    // Create migrations tracker table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS "__cinebook_migrations" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    for (const file of migrationFiles) {
      const checkRes = await client.query(
        "SELECT id FROM __cinebook_migrations WHERE name = $1",
        [file]
      );
      if (checkRes.rowCount && checkRes.rowCount > 0) {
        console.log(`⏩ Migration ${file} already applied.`);
        continue;
      }

      console.log(`📦 Applying migration: ${file}...`);
      const sqlContent = fs.readFileSync(path.join(drizzleDir, file), "utf-8");
      const statements = sqlContent.split("--> statement-breakpoint");

      await client.query("BEGIN");
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed.length > 0) {
          try {
            await client.query(trimmed);
          } catch (stmtErr: any) {
            // If plpgsql DO $$ block is rejected by pg-mem, execute the inner ALTER TABLE statement
            if (trimmed.includes("DO $$ BEGIN")) {
              const match = trimmed.match(/DO \$\$ BEGIN\s+([\s\S]*?)\s+EXCEPTION/i);
              if (match) {
                await client.query(match[1].trim()).catch(() => {});
                continue;
              }
            }
            throw stmtErr;
          }
        }
      }
      await client.query(
        "INSERT INTO __cinebook_migrations (name) VALUES ($1)",
        [file]
      );
      await client.query("COMMIT");
      console.log(`✅ Applied ${file}`);
    }

    console.log("🎉 All migrations applied successfully!");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("❌ Migration error:", err);
    throw err;
  } finally {
    client.release();
    if (!customPool) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
