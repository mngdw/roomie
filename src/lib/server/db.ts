/**
 * ROOMIE · Server Database Connection & Session Management
 * Connects to PostgreSQL with Supabase RLS simulation.
 */
import pg from "pg";

let pool: pg.Pool | null = null;

export const DEFAULT_DB_NAME = process.env.ROOMIE_DB_NAME ?? "roomie";
export const DB_HOST = process.env.ROOMIE_DB_HOST ?? "127.0.0.1";
export const DB_PORT = Number(process.env.ROOMIE_DB_PORT ?? 54329);
export const DB_USER = process.env.ROOMIE_DB_USER ?? "postgres";
export const DB_PASSWORD = process.env.ROOMIE_DB_PASSWORD ?? "postgres";

/**
 * Returns a shared connection pool to the ROOMIE database.
 */
export async function getDbPool(): Promise<pg.Pool> {
  if (!pool) {
    if (process.env.DATABASE_URL) {
      pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    } else {
      pool = new pg.Pool({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DEFAULT_DB_NAME,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    }
  }
  return pool;
}

/**
 * Executes a callback within an authenticated user session in PostgreSQL.
 * Sets the local role to 'authenticated' and configures 'request.jwt.claims'
 * so that Row Level Security (RLS) policies and auth.uid() function correctly.
 */
export async function withSessionDb<T>(
  userId: string,
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const p = await getDbPool();
  const client = await p.connect();
  try {
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query(
      `select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: userId, role: "authenticated" })]
    );
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Executes a callback with superuser/service-role access.
 */
export async function withAdminDb<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const p = await getDbPool();
  const client = await p.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
