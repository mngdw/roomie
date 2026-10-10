import { getCurrentUserId, getCurrentUser } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { VerificationClient } from "./VerificationClient";

export default async function VerificationPage() {
  const currentUserId = await getCurrentUserId();
  const currentUser = await getCurrentUser();

  const record = await withAdminDb(async (client) => {
    const res = await client.query(
      `
      select status, id_number_last4 as cccd_last4, submitted_at
      from public.verification_records
      where user_id = $1
      order by created_at desc
      limit 1
    `,
      [currentUserId]
    );
    return res.rows[0];
  });

  const isVerified = record?.status === "verified";
  const cccdLast4 = record?.cccd_last4 ?? null;
  const submittedAt = record?.submitted_at ? new Date(record.submitted_at).toLocaleDateString("vi-VN") : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <VerificationClient
        isVerified={isVerified}
        cccdLast4={cccdLast4}
        submittedAt={submittedAt}
      />
    </div>
  );
}
