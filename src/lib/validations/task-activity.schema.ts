import { z } from "zod";

/** Báo cáo tiến độ hằng ngày. */
export const dailyUpdateSchema = z.object({
  content: z
    .string()
    .trim()
    .min(3, "Nội dung báo cáo tối thiểu 3 ký tự.")
    .max(2000, "Nội dung tối đa 2000 ký tự."),
});

/** Bình luận trong công việc. */
export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Bình luận không được để trống.")
    .max(2000, "Bình luận tối đa 2000 ký tự."),
});

/** Đính kèm dạng đường dẫn (link Google Drive, tài liệu online…). */
export const linkAttachmentSchema = z.object({
  url: z.url("Đường dẫn không hợp lệ (phải bắt đầu bằng http:// hoặc https://)."),
  file_name: z
    .string()
    .trim()
    .max(200, "Tên tối đa 200 ký tự.")
    .optional()
    .or(z.literal("")),
});
