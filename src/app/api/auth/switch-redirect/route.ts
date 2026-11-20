import { NextRequest, NextResponse } from "next/server";
import {
  setCurrentUserId,
  clearSession,
  invalidateUserSummaryCache,
} from "@/lib/server/session";

export async function GET(request: NextRequest) {
  // Never mutate session cookies on background browser or Next.js router prefetch requests
  const isPrefetch =
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose")?.includes("prefetch") ||
    request.headers.get("next-router-prefetch") !== null ||
    request.headers.get("rsc") !== null;

  if (isPrefetch) {
    return new NextResponse(null, { status: 204 });
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");

  if (userId === "logout") {
    await clearSession();
    invalidateUserSummaryCache();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!userId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  await setCurrentUserId(userId);
  invalidateUserSummaryCache(userId);
  return NextResponse.redirect(new URL("/discovery", request.url));
}
