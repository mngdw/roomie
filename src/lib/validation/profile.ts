import { z } from "zod";

export const GenderSchema = z.enum(["male", "female", "other"]);
export const HousingStatusSchema = z.enum(["has_room", "looking_for_room"]);
export const VerificationStatusSchema = z.enum(["unverified", "pending", "verified", "rejected"]);

export const MbtiTypeSchema = z.string().regex(/^[EI][SN][TF][JP]$/, "MBTI phải gồm 4 ký tự hợp lệ (ví dụ: INTJ, ESFP)");

/**
 * Validate age >= 18.
 */
function isAtLeast18YearsOld(dobStr: string): boolean {
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return false;
  const now = new Date();
  const minDate = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
  return dob <= minDate && dob >= new Date("1900-01-01");
}

export const ProfileFormSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Tên hiển thị không được để trống")
    .max(40, "Tên hiển thị tối đa 40 ký tự"),
  full_name: z
    .string()
    .trim()
    .min(2, "Họ và tên tối thiểu 2 ký tự")
    .max(80, "Họ và tên tối đa 80 ký tự"),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh phải theo định dạng YYYY-MM-DD")
    .refine(isAtLeast18YearsOld, "Bạn phải đủ 18 tuổi để sử dụng ROOMIE"),
  gender: GenderSchema,
  school_or_workplace: z.string().trim().max(120, "Trường học/Nơi làm việc tối đa 120 ký tự").nullable().optional(),
  occupation: z.string().trim().max(80, "Nghề nghiệp tối đa 80 ký tự").nullable().optional(),
  city_code: z.string().min(1, "Vui lòng chọn Tỉnh/Thành phố"),
  district_code: z.string().min(1, "Vui lòng chọn Quận/Huyện"),
  hometown_code: z.string().nullable().optional(),
  bio: z.string().trim().max(500, "Tiểu sử tối đa 500 ký tự").nullable().optional(),
  avatar_path: z.string().max(300).nullable().optional(),
  mbti_type: MbtiTypeSchema.nullable().optional(),
  is_smoker: z.boolean().default(false),
  housing_status: HousingStatusSchema,
});

export type ProfileFormInput = z.infer<typeof ProfileFormSchema>;
