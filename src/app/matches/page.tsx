import { redirect } from "next/navigation";
import { getCurrentUserId, getCurrentUser } from "@/lib/server/session";
import { withAdminDb } from "@/lib/server/db";
import { fetchCandidateUser } from "@/lib/matching/recommendations";
import { scorePair } from "@/lib/matching/scoring";
import { MatchScoreBadge } from "@/components/MatchScoreBadge";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Eye,
  Sparkles,
  MapPin,
  CheckCircle2,
  Calendar,
  Compass,
  PhoneCall,
  Mail,
} from "lucide-react";

export default async function MatchesPage() {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    redirect("/login");
  }
  const currentUser = await getCurrentUser();

  const viewer = await withAdminDb(async (client) => {
    return await fetchCandidateUser(client, currentUserId);
  });

  const matchesData = await withAdminDb(async (client) => {
    const res = await client.query(
      `
      select m.id as match_id,
             m.created_at as matched_at,
             c.id as conversation_id,
             case when m.user_a = $1 then m.user_b else m.user_a end as partner_id
      from public.matches m
      left join public.conversations c on c.match_id = m.id
      where (m.user_a = $1 or m.user_b = $1)
        and m.status = 'active'
      order by m.created_at desc
    `,
      [currentUserId]
    );

    const partners = [];
    for (const row of res.rows) {
      const partner = await fetchCandidateUser(client, row.partner_id);
      if (partner) {
        let convId = row.conversation_id;
        if (!convId) {
          const ins = await client.query(
            `insert into public.conversations (match_id) values ($1) on conflict do nothing returning id`,
            [row.match_id]
          );
          convId = ins.rows[0]?.id;
          if (!convId) {
            const fetchConv = await client.query(
              `select id from public.conversations where match_id = $1`,
              [row.match_id]
            );
            convId = fetchConv.rows[0]?.id;
          }
        }

        const compatibility = viewer
          ? scorePair(viewer.answers, partner.answers)
          : null;
        partners.push({
          matchId: row.match_id,
          matchedAt: row.matched_at,
          conversationId: convId,
          partner,
          compatibility,
        });
      }
    }
    return partners;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 text-pink-700 text-xs font-bold mb-2">
            <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" />
            <span>Ghép đôi hai chiều</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Danh sách bạn cùng phòng đã ghép đôi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Đây là những người đã thích bạn và bạn cũng đã thích họ. Hãy bắt đầu
            trò chuyện để thảo luận chi tiết về việc ở chung!
          </p>
        </div>

        <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 text-xs shadow-sm self-start sm:self-auto">
          <span className="text-slate-500">Đã ghép đôi: </span>
          <span className="font-bold text-slate-900 text-sm">
            {matchesData.length} người
          </span>
        </div>
      </div>

      {matchesData.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto my-12 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 fill-pink-100" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Chưa có bạn cùng phòng nào ghép đôi
          </h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Khi bạn và một người khác cùng chọn "Thích" nhau, họ sẽ xuất hiện tại
            đây để bạn bắt đầu làm quen và trò chuyện.
          </p>
          <Link
            href="/discovery"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>Khám phá ứng viên ngay</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matchesData.map((m) => (
            <div
              key={m.matchId}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-100 to-purple-100 text-purple-700 font-bold text-xl flex items-center justify-center border border-purple-200 shadow-sm">
                      {m.partner.displayName[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-base text-slate-900">
                          {m.partner.displayName}
                        </h3>
                        {m.partner.isVerified && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-50" />
                        )}
                        <span className="text-xs text-slate-500">
                          ({m.partner.age}t)
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="capitalize">
                          {m.partner.districtCode?.replace("_", " ") || "Hà Nội"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {m.compatibility && (
                    <MatchScoreBadge score={m.compatibility.finalScore} size="sm" />
                  )}
                </div>

                {m.partner.bio && (
                  <p className="text-xs text-slate-600 italic line-clamp-2 mb-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    "{m.partner.bio}"
                  </p>
                )}

                {/* Direct Contact Channels */}
                <div className="mb-4 p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs text-slate-700 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 truncate max-w-[200px]" title={m.partner.email || "Email"}>
                    <Mail className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="truncate text-[11px] font-medium">{m.partner.email || "Liên hệ qua chat"}</span>
                  </div>
                  {m.partner.phone && (
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>{m.partner.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
                <Link
                  href={`/profile/${m.partner.userId}`}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                  title="Xem hồ sơ"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Hồ sơ</span>
                </Link>

                <Link
                  href={`/compatibility/${m.partner.userId}`}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
                  title="Điểm tương thích"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tương thích</span>
                </Link>

                {m.conversationId && (
                  <Link
                    href={`/chat/${m.conversationId}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Nhắn tin</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
