import pg from "pg";
import { connect } from "../../scripts/db/migrate";

export const TEST_DB = "roomie_test";

export const USER_IDS = {
  ngoc: "a0000000-0000-4000-8000-000000000001",
  linh: "a0000000-0000-4000-8000-000000000002",
  minh: "a0000000-0000-4000-8000-000000000003",
  trang: "a0000000-0000-4000-8000-000000000004",
  mai: "a0000000-0000-4000-8000-000000000005",
  ha: "a0000000-0000-4000-8000-000000000006",
  an: "a0000000-0000-4000-8000-000000000007",
  hung: "a0000000-0000-4000-8000-000000000008",
  lan: "a0000000-0000-4000-8000-000000000009",
  khoa: "a0000000-0000-4000-8000-00000000000a",
  admin: "a0000000-0000-4000-8000-0000000000ff",
};

export async function getAdminClient(): Promise<pg.Client> {
  return connect(TEST_DB);
}

/**
 * Run a block inside a transaction simulating the Supabase authenticated role for a specific user ID.
 * Automatically rolls back so tests stay isolated.
 */
export async function withUser<T>(
  userId: string,
  fn: (c: pg.Client) => Promise<T>,
): Promise<T> {
  const c = await getAdminClient();
  try {
    await c.query("begin");
    await c.query("set local role authenticated");
    await c.query(
      `select set_config('request.jwt.claims', $1, true)`,
      [JSON.stringify({ sub: userId, role: "authenticated" })],
    );
    const result = await fn(c);
    await c.query("rollback");
    return result;
  } catch (err) {
    await c.query("rollback").catch(() => {});
    throw err;
  } finally {
    await c.end();
  }
}

/**
 * Run a multi-user test scenario inside a single isolated transaction.
 * Switching user context via asUser(userId) maintains all uncommitted effects within the test
 * while guaranteeing complete rollback when the test completes.
 */
export async function withSession<T>(
  fn: (session: {
    asUser: <R>(userId: string, callback: (c: pg.Client) => Promise<R>) => Promise<R>;
    client: pg.Client;
  }) => Promise<T>,
): Promise<T> {
  const c = await getAdminClient();
  try {
    await c.query("begin");
    await c.query("set local role authenticated");
    const asUser = async <R>(userId: string, callback: (c: pg.Client) => Promise<R>): Promise<R> => {
      await c.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: userId, role: "authenticated" }),
      ]);
      return callback(c);
    };
    const result = await fn({ asUser, client: c });
    await c.query("rollback");
    return result;
  } catch (err) {
    await c.query("rollback").catch(() => {});
    throw err;
  } finally {
    await c.end();
  }
}

/**
 * Run a block inside a transaction simulating the Supabase anon role.
 */
export async function withAnon<T>(
  fn: (c: pg.Client) => Promise<T>,
): Promise<T> {
  const c = await getAdminClient();
  try {
    await c.query("begin");
    await c.query("set local role anon");
    await c.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
    const result = await fn(c);
    await c.query("rollback");
    return result;
  } catch (err) {
    await c.query("rollback").catch(() => {});
    throw err;
  } finally {
    await c.end();
  }
}
