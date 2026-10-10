import { NextRequest, NextResponse } from "next/server";
import { setCurrentUserId } from "@/lib/server/session";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");

  if (userId) {
    await setCurrentUserId(userId);
  }

  return NextResponse.redirect(new URL("/discovery", request.url));
}
