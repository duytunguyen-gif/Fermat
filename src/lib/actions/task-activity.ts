"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  dailyUpdateSchema,
  commentSchema,
  linkAttachmentSchema,
} from "@/lib/validations/task-activity.schema";
import { type ActionState, errorState, successState } from "./action-result";
import { zodFieldErrors } from "./zod-errors";

const BUCKET = "task-files";
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB

function taskPath(taskId: string) {
  return `/tasks/${taskId}`;
}

// ---------------------------------------------------------------------------
// Báo cáo tiến độ hằng ngày
// ---------------------------------------------------------------------------

/** Thêm/cập nhật báo cáo tiến độ của chính mình cho hôm nay. */
export async function saveDailyUpdate(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");

  const taskId = formData.get("task_id")?.toString();
  if (!taskId) return errorState("Thiếu mã công việc.");

  const parsed = dailyUpdateSchema.safeParse({ content: formData.get("content") });
  if (!parsed.success) {
    return errorState("Vui lòng kiểm tra lại.", zodFieldErrors(parsed.error));
  }

  const progressRaw = formData.get("progress_percent")?.toString().trim();
  let progress: number | null = null;
  if (progressRaw) {
    const n = Number(progressRaw);
    if (!Number.isInteger(n) || n < 0 || n > 100) {
      return errorState("Tiến độ phải là số nguyên từ 0 đến 100.", {
        progress_percent: "Nhập số từ 0 đến 100.",
      });
    }
    progress = n;
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Mỗi người 1 báo cáo/ngày/việc → có thì cập nhật, chưa có thì thêm.
  const { data: existing } = await supabase
    .from("task_daily_updates")
    .select("id")
    .eq("task_id", taskId)
    .eq("user_id", user.id)
    .eq("update_date", today)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("task_daily_updates")
        .update({ content: parsed.data.content, progress_percent: progress })
        .eq("id", existing.id)
    : await supabase.from("task_daily_updates").insert({
        task_id: taskId,
        user_id: user.id,
        content: parsed.data.content,
        progress_percent: progress,
      });

  if (error) {
    if (error.code === "42501") {
      return errorState("Chỉ người được giao việc mới báo cáo tiến độ được.");
    }
    return errorState(error.message);
  }

  revalidatePath(taskPath(taskId));
  return successState(existing ? "Đã cập nhật báo cáo hôm nay." : "Đã gửi báo cáo tiến độ.");
}

// ---------------------------------------------------------------------------
// Bình luận
// ---------------------------------------------------------------------------

export async function addComment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");

  const taskId = formData.get("task_id")?.toString();
  if (!taskId) return errorState("Thiếu mã công việc.");

  const parsed = commentSchema.safeParse({ content: formData.get("content") });
  if (!parsed.success) {
    return errorState("Vui lòng kiểm tra lại.", zodFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("task_comments").insert({
    task_id: taskId,
    user_id: user.id,
    content: parsed.data.content,
  });

  if (error) return errorState(error.message);

  revalidatePath(taskPath(taskId));
  return successState("Đã thêm bình luận.");
}

/** Sửa bình luận của chính mình. */
export async function updateComment(
  commentId: string,
  taskId: string,
  content: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");

  const parsed = commentSchema.safeParse({ content });
  if (!parsed.success) {
    return errorState(parsed.error.issues[0]?.message ?? "Nội dung không hợp lệ.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("task_comments")
    .update({ content: parsed.data.content })
    .eq("id", commentId);

  if (error) return errorState(error.message);

  revalidatePath(taskPath(taskId));
  return successState("Đã cập nhật bình luận.");
}

/** Xoá bình luận (của mình hoặc Admin+). */
export async function deleteComment(
  commentId: string,
  taskId: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("task_comments")
    .delete()
    .eq("id", commentId);

  if (error) return errorState(error.message);

  revalidatePath(taskPath(taskId));
  return successState("Đã xoá bình luận.");
}

// ---------------------------------------------------------------------------
// Tệp đính kèm
// ---------------------------------------------------------------------------

/** Thêm đính kèm dạng đường dẫn (link). */
export async function addLinkAttachment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");

  const taskId = formData.get("task_id")?.toString();
  if (!taskId) return errorState("Thiếu mã công việc.");

  const parsed = linkAttachmentSchema.safeParse({
    url: formData.get("url"),
    file_name: formData.get("file_name"),
  });
  if (!parsed.success) {
    return errorState("Vui lòng kiểm tra lại.", zodFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("task_attachments").insert({
    task_id: taskId,
    uploaded_by: user.id,
    attachment_type: "link",
    url: parsed.data.url,
    file_name: parsed.data.file_name || parsed.data.url,
  });

  if (error) return errorState(error.message);

  revalidatePath(taskPath(taskId));
  return successState("Đã thêm đường dẫn.");
}

/** Tải tệp lên (lưu ở Storage qua service-role) và tạo bản ghi đính kèm. */
export async function uploadFileAttachment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");

  const taskId = formData.get("task_id")?.toString();
  if (!taskId) return errorState("Thiếu mã công việc.");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return errorState("Vui lòng chọn một tệp.");
  }
  if (file.size > MAX_FILE_BYTES) {
    return errorState("Tệp quá lớn (tối đa 20MB).");
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120);
  const path = `${taskId}/${crypto.randomUUID()}-${safeName}`;

  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (upErr) return errorState(`Tải tệp thất bại: ${upErr.message}`);

  const supabase = await createClient();
  const { error } = await supabase.from("task_attachments").insert({
    task_id: taskId,
    uploaded_by: user.id,
    attachment_type: "file",
    file_path: path,
    file_name: file.name,
    file_size_bytes: file.size,
  });

  if (error) {
    // Bản ghi hỏng → dọn tệp vừa tải để không mồ côi.
    await admin.storage.from(BUCKET).remove([path]);
    return errorState(error.message);
  }

  revalidatePath(taskPath(taskId));
  return successState("Đã tải tệp lên.");
}

/** Xoá đính kèm (của mình hoặc Manager+). Nếu là tệp thì xoá luôn trong Storage. */
export async function deleteAttachment(
  attachmentId: string,
  taskId: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("task_attachments")
    .select("attachment_type, file_path")
    .eq("id", attachmentId)
    .maybeSingle();

  const { error } = await supabase
    .from("task_attachments")
    .delete()
    .eq("id", attachmentId);

  if (error) return errorState(error.message);

  if (row?.attachment_type === "file" && row.file_path) {
    await createAdminClient().storage.from(BUCKET).remove([row.file_path]);
  }

  revalidatePath(taskPath(taskId));
  return successState("Đã xoá đính kèm.");
}

/** Tạo URL tải xuống tạm thời (signed) cho một tệp trong Storage. */
export async function createAttachmentSignedUrl(
  filePath: string,
): Promise<string | null> {
  const { data } = await createAdminClient()
    .storage.from(BUCKET)
    .createSignedUrl(filePath, 60 * 60); // 1 giờ
  return data?.signedUrl ?? null;
}
