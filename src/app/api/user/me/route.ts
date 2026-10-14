import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/session";

/**
 * REST API: Get Current Authenticated User Profile & Completion Status
 * GET /api/user/me
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, authenticated: false, error: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        authenticated: true,
        user,
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
