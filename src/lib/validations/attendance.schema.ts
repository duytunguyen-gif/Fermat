import { z } from "zod";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/; // HH:mm 24h
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/; // yyyy-mm-dd

/**
 * Chấm công thủ công / chỉnh sửa: người dùng tự chọn ngày + giờ vào/ra.
 * Dùng cho trường hợp quên chấm, chấm cuối ngày, hoặc admin sửa hộ.
 * Giờ để trống ("") nghĩa là không đặt (giờ ra có thể trống nếu chưa về).
 */
export const manualAttendanceSchema = z
  .object({
    work_date: z.string().regex(DATE_RE, "Ngày không hợp lệ."),
    check_in_time: z
      .string()
      .regex(TIME_RE, "Giờ vào không hợp lệ (HH:mm).")
      .or(z.literal("")),
    check_out_time: z
      .string()
      .regex(TIME_RE, "Giờ ra không hợp lệ (HH:mm).")
      .or(z.literal("")),
    note: z.string().max(300, "Ghi chú tối đa 300 ký tự.").optional().default(""),
    target_user_id: z.string().uuid().optional(),
  })
  .refine((d) => d.check_in_time !== "", {
    message: "Cần nhập giờ vào.",
    path: ["check_in_time"],
  })
  .refine(
    (d) =>
      d.check_out_time === "" ||
      d.check_in_time === "" ||
      d.check_out_time > d.check_in_time,
    { message: "Giờ ra phải sau giờ vào.", path: ["check_out_time"] },
  );

export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;
