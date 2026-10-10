import { z } from "zod";
import { GenderSchema } from "./profile";

export const SmokingPolicySchema = z.enum(["any", "non_smoker_only"]);
export const RoomTypeSchema = z.enum(["private", "shared"]);

export const RequirementTagSchema = z.enum([
  "pays_on_time",
  "clean_tidy",
  "respects_privacy",
  "no_smoking",
  "share_costs",
]);

export const RoommatePreferencesSchema = z
  .object({
    accepted_genders: z
      .array(GenderSchema)
      .min(1, "Phải chọn ít nhất một giới tính chấp nhận")
      .default(["male", "female", "other"]),
    age_min: z.number().int().min(18, "Độ tuổi tối thiểu là 18").nullable().optional(),
    age_max: z.number().int().max(99, "Độ tuổi tối đa là 99").nullable().optional(),
    age_is_dealbreaker: z.boolean().default(false),
    smoking_policy: SmokingPolicySchema.default("any"),
    requirement_tags: z.array(RequirementTagSchema).default([]),
  })
  .refine(
    (data) => {
      if (data.age_min && data.age_max) {
        return data.age_min <= data.age_max;
      }
      return true;
    },
    {
      message: "Độ tuổi tối thiểu không được lớn hơn độ tuổi tối đa",
      path: ["age_min"],
    },
  );

export type RoommatePreferencesInput = z.infer<typeof RoommatePreferencesSchema>;

export const RoomPreferencesSchema = z
  .object({
    preferred_district_codes: z.array(z.string()).default([]),
    budget_min: z.number().int().nonnegative("Ngân sách tối thiểu không thể âm").nullable().optional(),
    budget_max: z.number().int().positive("Ngân sách tối đa phải lớn hơn 0"),
    room_types: z.array(RoomTypeSchema).default([]),
    move_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày chuyển vào phải theo định dạng YYYY-MM-DD"),
    move_in_flex_days: z.number().int().min(0).max(180).default(30),
    must_have_facilities: z.array(z.string()).default([]),
    require_media: z.boolean().default(false),
    notes: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự").nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.budget_min !== undefined && data.budget_min !== null) {
        return data.budget_min <= data.budget_max;
      }
      return true;
    },
    {
      message: "Ngân sách tối thiểu không được vượt quá ngân sách tối đa",
      path: ["budget_min"],
    },
  );

export type RoomPreferencesInput = z.infer<typeof RoomPreferencesSchema>;
