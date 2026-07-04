import { z } from "zod";

export const systemRoleSchema = z.enum([
  "super_admin",
  "executive",
  "admin",
  "manager",
  "staff",
]);

/** Dữ liệu khi duyệt/cập nhật một tài khoản: vai trò + phòng ban. */
export const assignUserSchema = z.object({
  system_role: systemRoleSchema,
  department_id: z.uuid("Phòng ban không hợp lệ.").nullable().optional(),
});

export type AssignUserInput = z.infer<typeof assignUserSchema>;
