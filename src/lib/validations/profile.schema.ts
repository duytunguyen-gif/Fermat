import { z } from "zod";

/** Chuỗi rỗng → undefined (để lưu null cho các trường không bắt buộc). */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Tối đa ${max} ký tự.`)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : ""));

/** Cập nhật hồ sơ cá nhân của chính mình. */
export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên hiển thị.")
    .max(120, "Tối đa 120 ký tự."),
  real_name: optionalText(120),
  phone: z
    .string()
    .trim()
    .max(20, "Tối đa 20 ký tự.")
    .regex(/^[0-9+()\s.-]*$/, "Số điện thoại không hợp lệ.")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : "")),
  employee_code: optionalText(40),
  job_title: optionalText(120),
  date_of_birth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh không hợp lệ.")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : "")),
  address: optionalText(255),
});

export type ProfileInput = z.infer<typeof profileSchema>;
