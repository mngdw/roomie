import pg from "pg";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:uH2t7klyNnatHFoV@db.pdikiegygpmphljioepy.supabase.co:5432/postgres";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const SEED_FILE = path.join(ROOT, "supabase", "seed.sql");

async function main() {
  console.log("Connecting to Supabase...");
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Connected successfully!");

  // Ensure schema_migrations table
  await client.query(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version    text primary key,
      name       text,
      statements text[]
    );
  `);

  const doneRes = await client.query(
    "select version from supabase_migrations.schema_migrations"
  );
  const done = new Set(doneRes.rows.map((r) => r.version as string));

  const migrations = readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort()
    .map((file) => ({
      file,
      version: file.split("_")[0],
      name: file.replace(/^\d+_/, "").replace(/\.sql$/, ""),
      sql: readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"),
    }));

  for (const m of migrations) {
    if (done.has(m.version)) {
      console.log(`[skip] ${m.file} already applied`);
      continue;
    }
    console.log(`[applying] ${m.file}...`);
    try {
      await client.query("begin");
      await client.query(m.sql);
      await client.query(
        "insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, $2, $3)",
        [m.version, m.name, [m.sql]]
      );
      await client.query("commit");
      console.log(`  -> Applied ${m.file}`);
    } catch (err) {
      await client.query("rollback");
      console.error(`Error applying ${m.file}:`, (err as Error).message);
      throw err;
    }
  }

  // Check if seed should run
  const checkSeed = await client.query(
    `select count(*) as cnt from public.question_categories`
  );
  console.log(`Question categories in DB: ${checkSeed.rows[0].cnt}`);

  const checkUsers = await client.query(
    `select count(*) as cnt from public.users`
  );
  console.log(`Users currently in DB: ${checkUsers.rows[0].cnt}`);

  if (Number(checkUsers.rows[0].cnt) === 0) {
    console.log("Applying seed data...");
    const seedSql = readFileSync(SEED_FILE, "utf8");
    await client.query(seedSql);
    console.log("Seed data applied successfully!");
  } else {
    console.log("Seed users already exist, skipping seed.");
  }

  await client.end();
  console.log("All Supabase migrations completed!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
