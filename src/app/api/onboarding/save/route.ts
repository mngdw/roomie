import { NextResponse } from "next/server";
import { saveOnboardingAction, type OnboardingPayload } from "@/app/actions";
import { getCurrentUserId } from "@/lib/server/session";

/**
 * REST API: Save Onboarding & 30 Questionnaire Answers
 * POST /api/onboarding/save
 * Body: OnboardingPayload & optional explicitUserId
 */
export async function POST(req: Request) {
  try {
    const currentUserId = await getCurrentUserId();
    const body = await req.json();
    const explicitUserId = body.userId || currentUserId;

    if (!explicitUserId) {
      return NextResponse.json(
        { success: false, error: "Chưa đăng nhập. Vui lòng đăng ký hoặc đăng nhập trước khi lưu bài test." },
        { status: 401 }
      );
    }

    const payload: OnboardingPayload = body;
    const result = await saveOnboardingAction(payload, explicitUserId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Lưu hồ sơ và 30 câu trả lời khảo sát thành công!",
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
