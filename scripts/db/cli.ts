/**
 * npm run db:<command>
 *   start    start the local database and keep it running (Ctrl+C to stop)
 *   migrate  apply pending migrations
 *   seed     load development data (supabase/seed.sql)
 *   reset    drop + recreate the `roomie` database, migrate, seed
 *   types    regenerate src/lib/db/database.types.ts and the questionnaire catalog
 */
import { applyShim, connect, migrate, seed } from "./migrate";
import { ensureDatabase, recreateDatabase, startServer, withServer, connectionString } from "./server";

const DEV_DB = process.env.ROOMIE_DB_NAME ?? "roomie";

async function main() {
  const cmd = process.argv[2];
  switch (cmd) {
    case "start": {
      const server = await startServer();
      await ensureDatabase(DEV_DB);
      console.log(`Database running: ${connectionString(DEV_DB)}`);
      console.log("Press Ctrl+C to stop.");
      const stop = async () => {
        await server.stop();
        process.exit(0);
      };
      process.on("SIGINT", stop);
      process.on("SIGTERM", stop);
      setInterval(() => {}, 1 << 30);
      return;
    }
    case "migrate":
      await withServer(async () => {
        await ensureDatabase(DEV_DB);
        const c = await connect(DEV_DB);
        try {
          await applyShim(c);
          const applied = await migrate(c, console.log);
          console.log(applied.length ? `Applied ${applied.length} migration(s).` : "Database is up to date.");
        } finally {
          await c.end();
        }
      });
      return;
    case "seed":
      await withServer(async () => {
        const c = await connect(DEV_DB);
        try {
          await seed(c);
          console.log("Seed data loaded.");
        } finally {
          await c.end();
        }
      });
      return;
    case "reset":
      await withServer(async () => {
        await recreateDatabase(DEV_DB);
        const c = await connect(DEV_DB);
        try {
          await applyShim(c);
          await migrate(c, console.log);
          await seed(c);
          console.log("Database reset: schema + seed data ready.");
        } finally {
          await c.end();
        }
      });
      return;
    default:
      console.error("Usage: npm run db:<start|migrate|seed|reset|types>");
      process.exit(1);
  }
}

main().then(
  () => {
    if (process.argv[2] !== "start") process.exit(0);
  },
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
