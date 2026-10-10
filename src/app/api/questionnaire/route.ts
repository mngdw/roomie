import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server/session";
import { withSessionDb } from "@/lib/server/db";
import { QUESTIONNAIRE_QUESTIONS } from "@/lib/questionnaire/catalog.generated";

export async function POST(request: NextRequest) {
  try {
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

    const numToId = new Map(QUESTIONNAIRE_QUESTIONS.map((q) => [q.number, q.id]));

    await withSessionDb(currentUserId, async (client) => {
      for (const ans of answers) {
        const questionId = numToId.get(ans.questionNumber);
        if (!questionId) continue;

        await client.query(
          `
          insert into public.user_answers (
            user_id, question_id, option_values, other_text
          ) values ($1, $2, $3, $4)
          on conflict (user_id, question_id) do update set
            option_values = excluded.option_values,
            other_text = excluded.other_text,
            updated_at = now()
        `,
          [currentUserId, questionId, ans.optionValues, ans.otherText || null]
        );
      }
    });

    return NextResponse.json({ ok: true, saved: answers.length });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
