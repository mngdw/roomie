import { z } from "zod";
import { RoomTypeSchema } from "./preferences";

export const MediaKindSchema = z.enum(["image", "video"]);

export const RoomUtilitiesSchema = z.record(z.string(), z.unknown());

export const RoomFormSchema = z
  .object({
    city_code: z.string().min(1, "Vui lòng chọn Tỉnh/Thành phố"),
    district_code: z.string().min(1, "Vui lòng chọn Quận/Huyện"),
    address_line: z.string().trim().max(200, "Địa chỉ chi tiết tối đa 200 ký tự").nullable().optional(),
    monthly_rent: z.number().int().positive("Tiền thuê phòng hàng tháng phải lớn hơn 0"),
    deposit: z.number().int().nonnegative("Tiền đặt cọc không thể âm").nullable().optional(),
    area_m2: z.number().positive("Diện tích phòng phải lớn hơn 0").nullable().optional(),
    room_type: RoomTypeSchema,
    capacity_total: z.number().int().min(2, "Sức chứa tối thiểu 2 người").max(10, "Sức chứa tối đa 10 người"),
    current_occupants: z.number().int().min(1, "Số người đang ở tối thiểu là 1"),
    facilities: z.array(z.string()).default([]),
    services: z.array(z.string()).default([]),
    utilities: RoomUtilitiesSchema.default({}),
    available_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sẵn sàng phải theo định dạng YYYY-MM-DD"),
    notes: z.string().trim().max(1000, "Mô tả phòng tối đa 1000 ký tự").nullable().optional(),
    is_published: z.boolean().default(false),
  })
  .refine((data) => data.current_occupants <= data.capacity_total, {
    message: "Số người hiện tại không được vượt quá tổng sức chứa",
    path: ["current_occupants"],
  });

export type RoomFormInput = z.infer<typeof RoomFormSchema>;

export const RoomImageSchema = z.object({
  room_id: z.string().uuid(),
  kind: MediaKindSchema.default("image"),
  storage_path: z.string().min(3).max(300),
  position: z.number().int().nonnegative().default(0),
});

export type RoomImageInput = z.infer<typeof RoomImageSchema>;
