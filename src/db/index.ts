import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { seedDatabase } from "./seed";

const globalForCine = globalThis as unknown as {
  cineDbInstance?: ReturnType<typeof drizzle<typeof schema>>;
  cinePoolInstance?: Pool;
  cineSeedPromise?: Promise<any>;
};

export async function ensureSeeded() {
  if (!globalForCine.cineDbInstance) {
    getDb();
  }
  if (globalForCine.cineSeedPromise) {
    await globalForCine.cineSeedPromise;
  }
}

export function getDb() {
  if (globalForCine.cineDbInstance) {
    return globalForCine.cineDbInstance;
  }

  const connectionString = process.env.DATABASE_URL;

  // If a valid live PostgreSQL / Neon connection string is provided
  if (
    connectionString &&
    !connectionString.includes("user:password@ep-cool") &&
    connectionString.startsWith("postgres")
  ) {
    try {
      const pool = new Pool({
        connectionString,
        ssl: connectionString.includes("neon.tech") || connectionString.includes("sslmode=require")
          ? { rejectUnauthorized: false }
          : undefined,
        max: 10,
        idleTimeoutMillis: 30000,
      });

      globalForCine.cinePoolInstance = pool;
      globalForCine.cineDbInstance = drizzle(pool, { schema });
      return globalForCine.cineDbInstance;
    } catch (err) {
      console.warn("Failed to connect to DATABASE_URL, falling back to local memory engine:", err);
    }
  }

  // Fallback / Self-contained Local In-Memory Postgres for tests & zero-config dev
  try {
    // Dynamic require so pg-mem is only loaded when needed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { newDb, DataType } = require("pg-mem");
    const memDb = newDb({ autoCreateForeignKeyIndices: true });
    
    // Register gen_random_uuid() with explicit uuid return type
    memDb.public.registerFunction({
      name: "gen_random_uuid",
      returns: DataType.uuid,
      implementation: () => {
        return require("crypto").randomUUID();
      },
    });

    const client = memDb.adapters.createPg();
    const memPool = new client.Pool() as unknown as Pool;
    globalForCine.cinePoolInstance = memPool;
    globalForCine.cineDbInstance = drizzle(memPool, { schema });

    // Auto-initialize schema in memory
    try {
      const fs = require("fs");
      const path = require("path");
      const sqlFile = path.join(process.cwd(), "drizzle", "0000_narrow_karnak.sql");
      if (fs.existsSync(sqlFile)) {
        const sql = fs.readFileSync(sqlFile, "utf-8");
        const statements = sql.split("--> statement-breakpoint");
        for (const s of statements) {
          const t = s.trim();
          if (t) {
            try {
              memDb.public.none(t);
            } catch (e) {
              if (t.includes("DO $$ BEGIN")) {
                const m = t.match(/DO \$\$ BEGIN\s+([\s\S]*?)\s+EXCEPTION/i);
                if (m) memDb.public.none(m[1].trim());
              }
            }
          }
        }
        // Track seed promise
        globalForCine.cineSeedPromise = seedDatabase(memPool).catch((err: any) => {
          console.warn("Auto-seed error:", err.message);
        });
      }
    } catch (initErr) {
      console.warn("MemDb init warning:", initErr);
    }

    return globalForCine.cineDbInstance;
  } catch (err) {
    // Fallback standard pool
    const fallbackPool = new Pool({ connectionString: connectionString || "postgres://localhost:5432/cinebook" });
    globalForCine.cinePoolInstance = fallbackPool;
    globalForCine.cineDbInstance = drizzle(fallbackPool, { schema });
    return globalForCine.cineDbInstance;
  }
}

export function setDbPool(pool: Pool) {
  globalForCine.cinePoolInstance = pool;
  globalForCine.cineDbInstance = drizzle(pool, { schema });
}

export const db = getDb();
export const poolInstance: Pool = new Proxy({} as Pool, {
  get(target, prop, receiver) {
    if (!globalForCine.cinePoolInstance) {
      getDb();
    }
    const real = globalForCine.cinePoolInstance;
    if (!real) {
      throw new Error("Database pool not initialized");
    }
    const val = Reflect.get(real, prop, receiver);
    if (typeof val === "function") {
      return val.bind(real);
    }
    return val;
  },
});

