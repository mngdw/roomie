import { cookies } from "next/headers";
import crypto from "crypto";
import { getCurrentUserId } from "./session";
import { withAdminDb } from "./db";

export const ADMIN_COOKIE_NAME = "roomie_admin_session";
export const DEFAULT_ADMIN_PASSCODE = process.env.ADMIN_SECRET_KEY || "roomie@admin2026";
export const ADMIN_EMAILS = [
  "admin@roomie.test",
  ...(process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL.toLowerCase().trim()] : []),
];

function getAdminTokenSecret(): string {
  return crypto
    .createHash("sha256")
    .update(DEFAULT_ADMIN_PASSCODE + "_roomie_admin_v1")
    .digest("hex");
}

/**
 * Checks if the current visitor has active admin privileges.
 */
export async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    const expectedSecret = getAdminTokenSecret();

    // 1. Direct admin session cookie check
    if (adminCookie && adminCookie === expectedSecret) {
      return true;
    }

    // 2. Check if logged in user is an Admin
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return false;
    }

    return await withAdminDb(async (client) => {
      const res = await client.query(
        "select email, role from auth.users where id = $1",
        [currentUserId]
      );
      if (res.rows.length === 0) return false;
      const user = res.rows[0];
      const email = (user.email || "").toLowerCase();

      if (ADMIN_EMAILS.includes(email) || user.role === "admin") {
        return true;
      }
      return false;
    });
  } catch (err) {
    console.error("verifyAdminSession error:", err);
    return false;
  }
}

/**
 * Grants an admin session cookie.
 */
export async function setAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const secret = getAdminTokenSecret();
  cookieStore.set(ADMIN_COOKIE_NAME, secret, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Clears the admin session cookie.
 */
export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

/**
 * Verifies admin passcode or email/password credentials.
 */
export async function authenticateAdmin(
  passcodeOrPassword: string,
  email?: string
): Promise<{ success: boolean; error?: string }> {
  const input = (passcodeOrPassword || "").trim();
  if (!input) {
    return { success: false, error: "Vui lòng nhập mã truy cập quản trị viên hoặc mật khẩu Admin." };
  }

  // 1. Check Passcode directly
  if (input === DEFAULT_ADMIN_PASSCODE) {
    await setAdminSession();
    return { success: true };
  }

  // 2. Check Admin Account email & password if email provided
  const targetEmail = (email || "").toLowerCase().trim();
  if (targetEmail && ADMIN_EMAILS.includes(targetEmail)) {
    try {
      const isMatch = await withAdminDb(async (client) => {
        const res = await client.query(
          "select id from auth.users where lower(email) = $1 and encrypted_password = extensions.crypt($2, encrypted_password)",
          [targetEmail, input]
        );
        return res.rows.length > 0;
      });

      if (isMatch) {
        await setAdminSession();
        return { success: true };
      }
    } catch (err) {
      console.error("authenticateAdmin account check error:", err);
    }
  }

  return { success: false, error: "Mã truy cập hoặc thông tin quản trị không chính xác." };
}
