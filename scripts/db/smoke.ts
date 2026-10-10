import { startServer, withAdmin } from "./server";

async function main() {
  const server = await startServer();
  try {
    await withAdmin(async (c) => {
      const v = await c.query("show server_version");
      console.log("server_version:", v.rows[0].server_version);
      const ext = await c.query(
        "select name from pg_available_extensions where name in ('pgcrypto','pg_trgm','pgtap') order by 1",
      );
      console.log("extensions:", ext.rows.map((r) => r.name));
    });
  } finally {
    await server.stop();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
