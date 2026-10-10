import { z } from "zod";

export const TargetUserSchema = z.object({
  target_user_id: z.string().uuid("ID người dùng không hợp lệ"),
});

export const SendMessageSchema = z.object({
  conversation_id: z.string().uuid("ID hội thoại không hợp lệ"),
  body: z
    .string()
    .trim()
    .min(1, "Nội dung tin nhắn không được để trống")
    .max(2000, "Nội dung tin nhắn tối đa 2000 ký tự"),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
