import { NextResponse } from "next/server";
import { signUpAction } from "@/app/actions";

/**
 * REST API: User Registration
 * POST /api/auth/register
 * Body: { fullName: string, email: string, password: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, email, password } = body;

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Vui lòng cung cấp đầy đủ họ tên, email và mật khẩu." },
        { status: 400 }
      );
    }

    const result = await signUpAction({ fullName, email, password });
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Đăng ký tài khoản thành công",
        userId: result.userId,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
