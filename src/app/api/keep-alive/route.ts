import { NextResponse } from "next/server";
import { withAdminDb } from "@/lib/server/db";

/**
 * Daily Keep-Alive Endpoint (invoked by Vercel Cron)
 * Prevents Supabase Free Tier from auto-pausing after 7 days of inactivity.
 */
export async function GET() {
  try {
    const res = await withAdminDb(async (client) => {
      const q = await client.query("select count(*)::int as profiles_count from public.profiles");
      return q.rows[0]?.profiles_count ?? 0;
    });

    return NextResponse.json({
      ok: true,
      database: "online",
      profilesCount: res,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: true,
        database: "fallback_mode",
        message: (err as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
