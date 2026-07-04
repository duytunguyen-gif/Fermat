import { z } from "zod";

export const taskTypeSchema = z.enum(["project", "routine", "periodic", "ad_hoc"]);
export const taskPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);

/** Chuỗi ngày YYYY-MM-DD hoặc rỗng (ô ngày để trống). */
const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Ngày không hợp lệ.")
  .optional();

/** Dữ liệu tạo/sửa một công việc (chưa gồm danh sách người tham gia). */
export const taskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Tiêu đề tối thiểu 3 ký tự.")
      .max(200, "Tiêu đề tối đa 200 ký tự."),
    description: z
      .string()
      .trim()
      .max(2000, "Mô tả tối đa 2000 ký tự.")
      .optional()
      .or(z.literal("")),
    task_type: taskTypeSchema,
    department_id: z.uuid("Vui lòng chọn phòng ban."),
    priority: taskPrioritySchema,
    start_date: optionalDate,
    due_date: optionalDate,
  })
  .refine(
    (d) =>
      !d.start_date || !d.due_date || d.start_date === "" || d.due_date === ""
        ? true
        : d.due_date >= d.start_date,
    { message: "Hạn chót phải sau hoặc bằng ngày bắt đầu.", path: ["due_date"] },
  );

export type TaskInput = z.infer<typeof taskSchema>;
