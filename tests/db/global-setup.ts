import { applyShim, connect, migrate, seed } from "../../scripts/db/migrate";
import { isPortOpen, recreateDatabase, startServer, type LocalServer } from "../../scripts/db/server";

export const TEST_DB = "roomie_test";

let server: LocalServer | null = null;

export async function setup() {
  const portOpen = await isPortOpen();
  if (!portOpen) {
    server = await startServer();
  }
  await recreateDatabase(TEST_DB);
  const c = await connect(TEST_DB);
  try {
    await applyShim(c);
    await migrate(c);
    await seed(c);
  } finally {
    await c.end();
  }
}

export async function teardown() {
  if (server) {
    await server.stop();
  }
}
