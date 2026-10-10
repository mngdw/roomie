/** Ad-hoc SQL against the local dev database:  npx tsx scripts/db/query.ts "select 1" */
import { connect } from "./migrate";
import { withServer } from "./server";

async function main() {
  const sql = process.argv.slice(2).join(" ");
  await withServer(async () => {
    const c = await connect(process.env.ROOMIE_DB_NAME ?? "roomie");
    try {
      const res = await c.query(sql);
      for (const r of Array.isArray(res) ? res : [res]) if (r.rows?.length) console.table(r.rows);
    } finally {
      await c.end();
    }
  });
}
main().then(
  () => process.exit(0),
  (e) => {
    console.error(e.message);
    process.exit(1);
  },
);
