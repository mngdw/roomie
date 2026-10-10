import { NextRequest, NextResponse } from "next/server";
import { setCurrentUserId } from "@/lib/server/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
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
