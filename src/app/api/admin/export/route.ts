import { NextResponse } from "next/server";
import { withAdminDb } from "@/lib/server/db";
import { verifyAdminSession } from "@/lib/server/admin-auth";
import { QUESTIONNAIRE_QUESTIONS } from "@/lib/questionnaire/catalog.generated";

/**
 * REST API: Export Data in CSV format with UTF-8 BOM for Excel
 * GET /api/admin/export?type=users | answers
 */
export async function GET(req: Request) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, error: "403 Forbidden: Yêu cầu quyền Quản trị viên để xuất dữ liệu." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "users";

  try {
    return await withAdminDb(async (client) => {
      if (type === "answers") {
        // Export 30 questionnaire answers for all users
        const qMap = new Map(QUESTIONNAIRE_QUESTIONS.map((q) => [q.id, q]));

        const res = await client.query(`
          select 
            u.id as user_id,
            u.email,
            p.display_name,
            p.full_name,
            q.number as question_number,
            q.category_id,
            q.text_vi as question_text,
            a.option_values,
            a.other_text,
            a.updated_at
          from public.user_answers a
          join public.questions q on q.id = a.question_id
          join auth.users u on u.id = a.user_id
          join public.profiles p on p.user_id = u.id
          order by u.created_at desc, q.number asc
        `);

        // Build CSV
        const headers = [
          "User ID",
          "Email",
          "Họ và tên",
          "Tên hiển thị",
          "Câu hỏi #",
          "Nhóm chuyên mục",
          "Nội dung câu hỏi",
          "Phương án đã chọn",
          "Ý kiến khác",
          "Thời gian trả lời",
        ];

        const rows = res.rows.map((r) => {
          const q = QUESTIONNAIRE_QUESTIONS.find((item) => item.number === r.question_number);
          const optionLabels = (r.option_values || [])
            .map((val: number) => {
              const opt = q?.options.find((o) => o.value === val);
              return opt ? opt.label_vi : `Phương án ${val}`;
            })
            .join(" | ");

          return [
            `"${r.user_id}"`,
            `"${r.email}"`,
            `"${(r.full_name || "").replace(/"/g, '""')}"`,
            `"${(r.display_name || "").replace(/"/g, '""')}"`,
            r.question_number,
            `"${r.category_id}"`,
            `"${(r.question_text || "").replace(/"/g, '""')}"`,
            `"${optionLabels.replace(/"/g, '""')}"`,
            `"${(r.other_text || "").replace(/"/g, '""')}"`,
            `"${new Date(r.updated_at).toLocaleString("vi-VN")}"`,
          ].join(",");
        });

        const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

        return new NextResponse(csvContent, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="roomie_survey_answers_${Date.now()}.csv"`,
          },
        });
      }

      // Default: Export Users list
      const usersRes = await client.query(`
        select 
          u.id as user_id,
          u.email,
          u.created_at as registered_at,
          p.display_name,
          p.full_name,
          p.gender,
          p.date_of_birth,
          p.occupation,
          p.school_or_workplace,
          p.district_code,
          p.housing_status,
          p.completed_at,
          (select count(*)::int from public.user_answers a where a.user_id = u.id) as answered_count,
          (select count(*)::int from public.rooms r where r.owner_id = u.id) as rooms_count,
          (select status from public.verification_records v where v.user_id = u.id order by v.created_at desc limit 1) as verification_status
        from auth.users u
        left join public.profiles p on p.user_id = u.id
        order by u.created_at desc
      `);

      const headers = [
        "User ID",
        "Email",
        "Họ và tên",
        "Tên hiển thị",
        "Giới tính",
        "Ngày sinh",
        "Nghề nghiệp",
        "Trường / Nơi làm việc",
        "Khu vực (Quận)",
        "Tình trạng nhà ở",
        "Tiến độ bài test (30 câu)",
        "Trạng thái hoàn thành",
        "Thời gian hoàn tất",
        "Xác minh CCCD",
        "Ngày đăng ký",
      ];

      const rows = usersRes.rows.map((u) => {
        const isCompleted = u.completed_at !== null && u.answered_count >= 30;
        return [
          `"${u.user_id}"`,
          `"${u.email}"`,
          `"${(u.full_name || "").replace(/"/g, '""')}"`,
          `"${(u.display_name || "").replace(/"/g, '""')}"`,
          `"${u.gender === "female" ? "Nữ" : u.gender === "male" ? "Nam" : "Khác"}"`,
          `"${u.date_of_birth || ""}"`,
          `"${(u.occupation || "").replace(/"/g, '""')}"`,
          `"${(u.school_or_workplace || "").replace(/"/g, '""')}"`,
          `"${u.district_code || ""}"`,
          `"${u.housing_status === "has_room" ? "Đã có phòng sẵn" : "Đang tìm phòng"}"`,
          `"${u.answered_count || 0}/30 câu"`,
          `"${isCompleted ? "Đã hoàn thành" : "Chưa hoàn tất"}"`,
          `"${u.completed_at ? new Date(u.completed_at).toLocaleString("vi-VN") : "Chưa hoàn tất"}"`,
          `"${u.verification_status === "verified" ? "Đã xác minh" : "Chưa xác minh"}"`,
          `"${new Date(u.registered_at).toLocaleString("vi-VN")}"`,
        ].join(",");
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="roomie_users_${Date.now()}.csv"`,
        },
      });
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
