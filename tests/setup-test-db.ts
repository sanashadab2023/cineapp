import { newDb, DataType } from "pg-mem";
import crypto from "crypto";
import { runMigrations } from "../src/db/migrate";
import { seedDatabase } from "../src/db/seed";
import { Pool } from "pg";

export async function setupTestDb(): Promise<Pool> {
  const memDb = newDb({ autoCreateForeignKeyIndices: true });

  // Register UUID generator with proper DataType.uuid return type
  memDb.public.registerFunction({
    name: "gen_random_uuid",
    returns: DataType.uuid,
    implementation: () => crypto.randomUUID(),
  });

  const client = memDb.adapters.createPg();
  const pool = new client.Pool() as unknown as Pool;

  const { setDbPool } = require("../src/db");
  setDbPool(pool);

  // Run migrations and seed data
  await runMigrations(pool);
  await seedDatabase(pool);

  return pool;
}
