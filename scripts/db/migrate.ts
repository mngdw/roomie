/**
 * Migration runner.
 *
 *  - `supabase/local/*.sql`     local-only shim for Supabase platform objects (applied first)
 *  - `supabase/migrations/*.sql` the real migrations, applied in filename order, each in its own
 *                                transaction and recorded in supabase_migrations.schema_migrations
 *                                (the same table the Supabase CLI uses)
 *  - `supabase/seed.sql`        development data
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { connectionString } from "./server";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const LOCAL_DIR = path.join(ROOT, "supabase", "local");
const SEED_FILE = path.join(ROOT, "supabase", "seed.sql");

export function listMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort()
    .map((file) => ({
      file,
      version: file.split("_")[0],
      name: file.replace(/^\d+_/, "").replace(/\.sql$/, ""),
      sql: readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"),
    }));
}

export async function connect(database: string) {
  const c = new pg.Client({ connectionString: connectionString(database) });
  await c.connect();
  return c;
}

export async function applyShim(c: pg.Client) {
  for (const f of readdirSync(LOCAL_DIR).filter((x) => x.endsWith(".sql")).sort()) {
    await c.query(readFileSync(path.join(LOCAL_DIR, f), "utf8"));
  }
}

/** Apply pending migrations. Returns the versions that were applied now. */
export async function migrate(c: pg.Client, log: (m: string) => void = () => {}) {
  await c.query(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version    text primary key,
      name       text,
      statements text[]
    );`);
  const done = new Set(
    (await c.query("select version from supabase_migrations.schema_migrations")).rows.map((r) => r.version as string),
  );
  const applied: string[] = [];
  for (const m of listMigrations()) {
    if (done.has(m.version)) continue;
    log(`  applying ${m.file}`);
    try {
      await c.query("begin");
      await c.query(m.sql);
      await c.query(
        "insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, $2, $3)",
        [m.version, m.name, [m.sql]],
      );
      await c.query("commit");
    } catch (e) {
      await c.query("rollback");
      throw new Error(`migration ${m.file} failed: ${(e as Error).message}`);
    }
    applied.push(m.version);
  }
  return applied;
}

export async function seed(c: pg.Client) {
  await c.query(readFileSync(SEED_FILE, "utf8"));
}
