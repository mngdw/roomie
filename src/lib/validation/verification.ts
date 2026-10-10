import { z } from "zod";

export const VerificationSubmissionSchema = z.object({
  id_number: z
    .string()
    .trim()
    .regex(/^\d{12}$/, "Số CCCD phải gồm đúng 12 chữ số"),
  document_path: z.string().min(5, "Đường dẫn ảnh tài liệu không hợp lệ").max(300),
  consent_version: z.string().default("v1"),
  consent_accepted: z.literal(true, {
    error: "Bạn cần đồng ý với điều khoản xác thực thông tin cá nhân",
  }),
});

export type VerificationSubmissionInput = z.infer<typeof VerificationSubmissionSchema>;

export const VerificationReviewSchema = z
  .object({
    record_id: z.string().uuid("ID bản ghi xác thực không hợp lệ"),
    approve: z.boolean(),
    reason: z.string().trim().max(300, "Lý do từ chối tối đa 300 ký tự").nullable().optional(),
  })
  .refine(
    (data) => {
      if (!data.approve && (!data.reason || data.reason.trim().length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: "Vui lòng nhập lý do từ chối",
      path: ["reason"],
    },
  );

export type VerificationReviewInput = z.infer<typeof VerificationReviewSchema>;
