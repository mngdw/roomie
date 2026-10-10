import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getAdminClient, USER_IDS } from "./test-helper";

describe("Eligibility & Hard Filters Engine", () => {
  let client: any;

  beforeAll(async () => {
    client = await getAdminClient();
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  it("H0_self: user is never eligible with themselves", async () => {
    const res = await client.query(
      `select public.fn_pair_ineligibility_reasons($1, $1) as reasons`,
      [USER_IDS.ngoc],
    );
    expect(res.rows[0].reasons).toContain("H0_self");
  });

  it("H1_housing_roles: two users who both have rooms cannot be matched", async () => {
    // Linh has room, Minh has room
    const res = await client.query(
      `select public.fn_pair_ineligibility_reasons($1, $2) as reasons`,
      [USER_IDS.linh, USER_IDS.minh],
    );
    expect(res.rows[0].reasons).toContain("H1_housing_roles");
  });

  it("H2_gender: Ngọc accepts female only; Hà is male", async () => {
    const res = await client.query(
      `select public.fn_pair_ineligibility_reasons($1, $2) as reasons`,
      [USER_IDS.ngoc, USER_IDS.ha],
    );
    expect(res.rows[0].reasons).toContain("H2_gender");
  });

  it("H6_budget: An's room is 6.2M (3.1M/person) which exceeds Ngọc's max budget 2.4M", async () => {
    const res = await client.query(
      `select public.fn_pair_ineligibility_reasons($1, $2) as reasons`,
      [USER_IDS.ngoc, USER_IDS.an],
    );
    expect(res.rows[0].reasons).toContain("H6_budget");
  });

  it("H4_smoking: Khoa is a smoker; Ngọc requires non_smoker_only", async () => {
    const res = await client.query(
      `select public.fn_pair_ineligibility_reasons($1, $2) as reasons`,
      [USER_IDS.ngoc, USER_IDS.khoa],
    );
    expect(res.rows[0].reasons).toContain("H4_smoking");
  });

  it("calculates correct eligibility set for Ngọc", async () => {
    const res = await client.query(`
      select p.display_name,
             public.fn_is_pair_eligible($1, p.user_id) as eligible,
             public.fn_pair_ineligibility_reasons($1, p.user_id) as reasons
        from public.profiles p
       where p.user_id <> $1
       order by p.display_name;
    `, [USER_IDS.ngoc]);

    const results = Object.fromEntries(
      res.rows.map((r: any) => [r.display_name, { eligible: r.eligible, reasons: r.reasons }]),
    );

    // Eligible
    expect(results["Linh"].eligible).toBe(true);
    expect(results["Minh"].eligible).toBe(true);
    expect(results["Trang"].eligible).toBe(true);
    expect(results["Mai"].eligible).toBe(true);
    expect(results["Lan"].eligible).toBe(true);

    // Ineligible
    expect(results["Hà"].eligible).toBe(false);
    expect(results["Hà"].reasons).toContain("H2_gender");

    expect(results["An"].eligible).toBe(false);
    expect(results["An"].reasons).toContain("H6_budget");

    expect(results["Hùng"].eligible).toBe(false);
    expect(results["Khoa"].eligible).toBe(false);
  });

  it("fn_eligible_candidates excludes already matched users from discovery", async () => {
    // Linh is already a mutual match with Ngọc in the seed data
    const res = await client.query(`
      select p.display_name
        from public.fn_eligible_candidates($1) c
        join public.profiles p on p.user_id = c
       order by p.display_name;
    `, [USER_IDS.ngoc]);

    const names = res.rows.map((r: any) => r.display_name);

    // Should return exactly Lan, Mai, Minh, Trang (Linh is matched, so excluded from new recommendations)
    expect(names).toEqual(["Lan", "Mai", "Minh", "Trang"]);
  });
});
