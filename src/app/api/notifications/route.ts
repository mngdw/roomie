import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";

export async function GET() {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ notifications: [] });
    }

    const notifications = await withAdminDb(async (client) => {
      const res = await client.query(
        `
        select n.*, p.display_name as actor_name
        from public.notifications n
        left join public.profiles p on p.user_id = n.actor_id
        where n.user_id = $1
        order by n.created_at desc
        limit 10
      `,
        [currentUserId]
      );
      return res.rows;
    });

    return NextResponse.json({ notifications });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
