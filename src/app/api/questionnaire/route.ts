import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, invalidateUserSummaryCache } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { invalidateCandidateCache } from "@/lib/matching/recommendations";
import { QUESTIONNAIRE_QUESTIONS } from "@/lib/questionnaire/catalog.generated";
import { getFallbackCandidateUser } from "@/lib/data/fallback-candidates";

export async function POST(request: NextRequest) {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const body = await request.json();
  const answers: Array<{
    questionNumber: number;
    optionValues: number[];
    otherText?: string | null;
  }> = body.answers;

  if (!Array.isArray(answers)) {
    return NextResponse.json({ error: "Invalid answers array" }, { status: 400 });
  }

  try {
    const numToId = new Map(QUESTIONNAIRE_QUESTIONS.map((q) => [q.number, q.id]));

    await withAdminDb(async (client) => {
      const valuesSql: string[] = [];
      const params: unknown[] = [];

      for (const ans of answers) {
        const questionId = numToId.get(ans.questionNumber);
        if (!questionId) continue;
        const offset = params.length;
        valuesSql.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
        params.push(
          currentUserId,
          questionId,
          ans.optionValues,
          ans.otherText || null
        );
      }

      if (valuesSql.length > 0) {
        await client.query(
          `
          insert into public.user_answers (
            user_id, question_id, option_values, other_text
          ) values ${valuesSql.join(", ")}
          on conflict (user_id, question_id) do update set
            option_values = excluded.option_values,
            other_text = excluded.other_text,
            updated_at = now()
        `,
          params
        );
      }
    });

    invalidateUserSummaryCache(currentUserId);
    invalidateCandidateCache(currentUserId);

    return NextResponse.json({ ok: true, saved: answers.length });
  } catch (err) {
    console.warn("POST /api/questionnaire DB fallback active:", (err as Error).message);
    const fbUser = getFallbackCandidateUser(currentUserId);
    if (fbUser) {
      for (const ans of answers) {
        fbUser.answers.set(ans.questionNumber, {
          optionValues: ans.optionValues,
          otherText: ans.otherText || null,
        });
      }
    }
    invalidateUserSummaryCache(currentUserId);
    invalidateCandidateCache(currentUserId);
    return NextResponse.json({ ok: true, saved: answers.length, fallback: true });
  }
}
