import { NextResponse } from "next/server";
import { signInAction } from "@/app/actions";

/**
 * REST API: User Login
 * POST /api/auth/login
 * Body: { email: string, password: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập đầy đủ email và mật khẩu." },
        { status: 400 }
      );
    }

    const result = await signInAction({ email, password });
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Đăng nhập thành công",
        userId: result.userId,
        isCompleted: result.isCompleted,
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
