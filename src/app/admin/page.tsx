import { withAdminDb } from "@/lib/server/db";
import { verifyAdminSession } from "@/lib/server/admin-auth";
import { FALLBACK_CANDIDATES_MAP } from "@/lib/data/fallback-candidates";
import { AdminDashboard, type AdminUserRecord } from "./AdminDashboard";
import { AdminLoginGate } from "./AdminLoginGate";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAdmin = await verifyAdminSession();

  if (!isAdmin) {
    return <AdminLoginGate />;
  }

  let users: AdminUserRecord[] = [];

  try {
    users = await withAdminDb(async (client) => {
      // 1. Fetch all users from auth.users and profiles
      const usersRes = await client.query(`
        select 
          u.id,
          u.email,
          u.created_at,
          p.display_name,
          p.full_name,
          p.gender,
          p.date_of_birth,
          p.occupation,
          p.school_or_workplace,
          p.district_code,
          p.housing_status,
          p.completed_at,
          (select status from public.verification_records v where v.user_id = u.id order by v.created_at desc limit 1) as verification_status,
          (select count(*)::int from public.user_answers a where a.user_id = u.id) as answered_count
        from auth.users u
        left join public.profiles p on p.user_id = u.id
        order by u.created_at desc
      `);

      // 2. Fetch all user answers
      const answersRes = await client.query(`
        select a.user_id, a.option_values, a.other_text, q.number as question_number
        from public.user_answers a
        join public.questions q on q.id = a.question_id
        order by a.user_id, q.number asc
      `);

      // Group answers by user_id
      const answersByUser = new Map<
        string,
        Array<{ questionNumber: number; optionValues: number[]; otherText?: string | null }>
      >();

      for (const row of answersRes.rows) {
        if (!answersByUser.has(row.user_id)) {
          answersByUser.set(row.user_id, []);
        }
        answersByUser.get(row.user_id)!.push({
          questionNumber: row.question_number,
          optionValues: row.option_values || [],
          otherText: row.other_text,
        });
      }

      return usersRes.rows.map((row) => ({
        id: row.id,
        email: row.email || "N/A",
        displayName: row.display_name || row.email?.split("@")[0] || "Người dùng",
        fullName: row.full_name || row.display_name || "N/A",
        gender: row.gender || "other",
        dateOfBirth: row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : undefined,
        occupation: row.occupation || undefined,
        schoolOrWorkplace: row.school_or_workplace || undefined,
        districtCode: row.district_code || undefined,
        housingStatus: row.housing_status || "looking_for_room",
        isCompleted: row.completed_at !== null && (row.answered_count || 0) >= 30,
        answeredCount: Number(row.answered_count || 0),
        completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
        createdAt: new Date(row.created_at).toISOString(),
        isVerified: row.verification_status === "verified",
        answers: answersByUser.get(row.id) || [],
      }));
    });
  } catch (err) {
    console.warn("AdminPage DB fallback active:", (err as Error).message);
    users = Array.from(FALLBACK_CANDIDATES_MAP.values()).map((c) => ({
      id: c.userId,
      email: c.email || `${c.displayName.toLowerCase()}@roomie.test`,
      displayName: c.displayName,
      fullName: c.displayName,
      gender: c.gender,
      dateOfBirth: "2003-01-01",
      occupation: c.occupation || undefined,
      schoolOrWorkplace: c.schoolOrWorkplace || undefined,
      districtCode: c.districtCode || undefined,
      housingStatus: c.housingStatus,
      isCompleted: c.answers.size >= 30,
      answeredCount: c.answers.size,
      completedAt: c.createdAt,
      createdAt: c.createdAt,
      isVerified: c.isVerified,
      answers: Array.from(c.answers.entries()).map(([qNum, ans]) => ({
        questionNumber: qNum,
        optionValues: ans.optionValues,
        otherText: ans.otherText,
      })),
    }));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminDashboard initialUsers={users} />
    </div>
  );
}
