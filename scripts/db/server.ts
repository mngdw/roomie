/**
 * Local PostgreSQL server (embedded binaries, no Docker / admin rights needed).
 *
 * Used for local development and for the automated database tests. The data
 * directory lives in `.db/` (git-ignored) so it survives restarts.
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import pg from "pg";

export const DB_HOST = "127.0.0.1";
export const DB_PORT = Number(process.env.ROOMIE_DB_PORT ?? 54329);
export const DB_USER = "postgres";
export const DB_PASSWORD = "postgres";
export const DATA_DIR = path.resolve(process.cwd(), ".db", "data");

export function connectionString(database: string, user = DB_USER, password = DB_PASSWORD) {
  return `postgres://${user}:${password}@${DB_HOST}:${DB_PORT}/${database}`;
}

export interface LocalServer {
  stop: () => Promise<void>;
}

/** Start the server (initialising the data directory on first run). */
export async function startServer(): Promise<LocalServer> {
  const server = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],  // Windows would otherwise pick WIN1252
    postgresFlags: ["-c", "max_connections=100", "-c", "listen_addresses=127.0.0.1"],
    onLog: () => {},
    onError: (e: unknown) => {
      const msg = String(e);
      if (!/database system is ready|checkpoint|LOG:/i.test(msg)) console.error("[pg]", msg);
    },
  });
  if (!existsSync(path.join(DATA_DIR, "PG_VERSION"))) {
    await server.initialise();
  }
  await server.start();
  return { stop: () => server.stop() };
}

/** Connect to the maintenance database, run `fn`, disconnect. */
export async function withAdmin<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = new pg.Client({ connectionString: connectionString("postgres") });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

export async function recreateDatabase(name: string) {
  await withAdmin(async (c) => {
    await c.query(
      `select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`,
      [name],
    );
    await c.query(`drop database if exists ${JSON.stringify(name)}`);
    await c.query(`create database ${JSON.stringify(name)}`);
  });
}

export async function ensureDatabase(name: string) {
  await withAdmin(async (c) => {
    const r = await c.query(`select 1 from pg_database where datname = $1`, [name]);
    if (r.rowCount === 0) await c.query(`create database ${JSON.stringify(name)}`);
  });
}

/** Is something already accepting connections on the database port? */
export function isPortOpen(): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.connect({ host: DB_HOST, port: DB_PORT });
    s.once("connect", () => {
      s.destroy();
      resolve(true);
    });
    s.once("error", () => resolve(false));
  });
}

/**
 * Run `fn` against a running server. If none is running, start one for the duration
 * of `fn` and stop it afterwards (so `npm run db:reset` works with or without `db:start`).
 */
export async function withServer<T>(fn: () => Promise<T>): Promise<T> {
  if (await isPortOpen()) return fn();
  const server = await startServer();
  try {
    return await fn();
  } finally {
    await server.stop();
  }
}


