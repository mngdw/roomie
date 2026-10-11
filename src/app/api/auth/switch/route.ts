import { NextRequest, NextResponse } from "next/server";
import { setCurrentUserId, clearSession } from "@/lib/server/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId } = body;
    if (!userId || userId === "logout") {
      await clearSession();
      return NextResponse.json({ ok: true, loggedOut: true });
    }

    await setCurrentUserId(userId);
    return NextResponse.json({ ok: true, userId });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
