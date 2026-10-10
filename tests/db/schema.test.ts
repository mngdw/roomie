import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getAdminClient } from "./test-helper";

describe("Database Schema Integrity", () => {
  let client: any;

  beforeAll(async () => {
    client = await getAdminClient();
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  it("should have all 17+ core entities as tables", async () => {
    const res = await client.query(`
      select table_name
        from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'
       order by table_name;
    `);

    const tables = res.rows.map((r: any) => r.table_name);
    const requiredTables = [
      "users",
      "profiles",
      "roommate_preferences",
      "room_preferences",
      "rooms",
      "room_images",
      "question_categories",
      "questions",
      "question_options",
      "user_answers",
      "likes",
      "passes",
      "matches",
      "compatibility_scores",
      "conversations",
      "messages",
      "notifications",
      "verification_records",
      "profile_views",
      "geo_units",
    ];

    for (const table of requiredTables) {
      expect(tables).toContain(table);
    }
  });

  it("should have all 6 public security-barrier views", async () => {
    const res = await client.query(`
      select table_name
        from information_schema.views
       where table_schema = 'public'
       order by table_name;
    `);

    const views = res.rows.map((r: any) => r.table_name);
    const expectedViews = [
      "public_profiles",
      "public_roommate_requirements",
      "public_room_preferences",
      "public_rooms",
      "public_room_media",
      "public_lifestyle_answers",
    ];

    for (const view of expectedViews) {
      expect(views).toContain(view);
    }
  });

  it("should have RLS enabled on all public base tables", async () => {
    const res = await client.query(`
      select tablename, rowsecurity
        from pg_tables
       where schemaname = 'public'
       order by tablename;
    `);

    for (const row of res.rows) {
      expect(row.rowsecurity, `Table ${row.tablename} must have rowsecurity=true`).toBe(true);
    }
  });

  it("should verify question_categories weight sum is exactly 1.000", async () => {
    const res = await client.query(`
      select count(*) as count, sum(weight) as total_weight
        from public.question_categories;
    `);

    expect(Number(res.rows[0].count)).toBe(6);
    expect(Number(res.rows[0].total_weight)).toBe(1.0);
  });

  it("should verify all 30 questions exist with correct numbering", async () => {
    const res = await client.query(`
      select number, code, type, is_required, is_public
        from public.questions
       order by number;
    `);

    expect(res.rows.length).toBe(30);
    expect(res.rows[0].number).toBe(1);
    expect(res.rows[29].number).toBe(30);

    // Q14 is multi_choice
    const q14 = res.rows.find((r: any) => r.number === 14);
    expect(q14.type).toBe("multi_choice");

    // Q22 is single_choice
    const q22 = res.rows.find((r: any) => r.number === 22);
    expect(q22.type).toBe("single_choice");

    // All others are scale_1_5
    const scales = res.rows.filter((r: any) => r.type === "scale_1_5");
    expect(scales.length).toBe(28);
  });

  it("should verify UUID primary keys on main tables", async () => {
    const res = await client.query(`
      select tc.table_name, c.column_name, c.udt_name
        from information_schema.table_constraints tc
        join information_schema.constraint_column_usage ccu
          on tc.constraint_name = ccu.constraint_name
         and tc.table_schema = ccu.table_schema
        join information_schema.columns c
          on ccu.table_name = c.table_name
         and ccu.column_name = c.column_name
         and ccu.table_schema = c.table_schema
       where tc.constraint_type = 'PRIMARY KEY'
         and tc.table_schema = 'public'
         and tc.table_name in ('users', 'profiles', 'rooms', 'questions', 'matches', 'conversations', 'messages', 'notifications', 'verification_records');
    `);

    for (const row of res.rows) {
      if (row.column_name === "id" || row.column_name === "user_id") {
        expect(row.udt_name, `Primary key column ${row.table_name}.${row.column_name} should be uuid`).toBe("uuid");
      }
    }
  });
});
