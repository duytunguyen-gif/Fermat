import { z } from "zod";

export const departmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên phòng ban tối thiểu 2 ký tự.")
    .max(120, "Tên phòng ban tối đa 120 ký tự."),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Mã phòng ban tối thiểu 2 ký tự.")
    .max(20, "Mã phòng ban tối đa 20 ký tự.")
    .regex(
      /^[A-Z0-9_]+$/,
      "Mã chỉ gồm chữ in hoa, số và dấu gạch dưới (vd: AI_CDS).",
    ),
  description: z
    .string()
    .trim()
    .max(300, "Mô tả tối đa 300 ký tự.")
    .optional()
    .or(z.literal("")),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
