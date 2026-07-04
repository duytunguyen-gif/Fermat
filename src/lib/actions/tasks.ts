"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { taskSchema } from "@/lib/validations/task.schema";
import { canTransition } from "@/lib/constants/task-status";
import type {
  TaskParticipationRole,
  TaskStatus,
} from "@/types/database.types";
import { type ActionState, errorState, successState } from "./action-result";
import { zodFieldErrors } from "./zod-errors";

/** Trả về giá trị đã trim, hoặc null nếu rỗng / là "none". */
function cleanId(value: FormDataEntryValue | null): string | null {
  const s = value?.toString().trim();
  return !s || s === "none" ? null : s;
}

function parseTaskForm(formData: FormData) {
  return taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    task_type: formData.get("task_type"),
    department_id: formData.get("department_id"),
    priority: formData.get("priority"),
    start_date: formData.get("start_date"),
    due_date: formData.get("due_date"),
  });
}

/** Tạo công việc mới kèm người phụ trách chính + người phối hợp. */
export async function createTask(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập để tạo công việc.");

  const parsed = parseTaskForm(formData);
  if (!parsed.success) {
    return errorState("Vui lòng kiểm tra lại thông tin.", zodFieldErrors(parsed.error));
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title: d.title,
      description: d.description || null,
      task_type: d.task_type,
      department_id: d.department_id,
      priority: d.priority,
      start_date: d.start_date || null,
      due_date: d.due_date || null,
      approver_id: cleanId(formData.get("approver_id")),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !task) {
    return errorState(error?.message ?? "Không tạo được công việc.");
  }

  // Gán người tham gia (nếu có).
  const leadId = cleanId(formData.get("lead_id"));
  const collaboratorIds = formData
    .getAll("collaborator_ids")
    .map((v) => v.toString())
    .filter(Boolean);

  const rows: {
    task_id: string;
    user_id: string;
    participation_role: TaskParticipationRole;
    assigned_by: string;
  }[] = [];
  if (leadId) {
    rows.push({ task_id: task.id, user_id: leadId, participation_role: "lead", assigned_by: user.id });
  }
  for (const cid of collaboratorIds) {
    if (cid === leadId) continue; // không trùng với lead
    rows.push({ task_id: task.id, user_id: cid, participation_role: "collaborator", assigned_by: user.id });
  }

  if (rows.length > 0) {
    const { error: aErr } = await supabase.from("task_assignees").insert(rows);
    if (aErr) {
      revalidatePath("/tasks");
      return errorState(`Đã tạo công việc nhưng gán người chưa xong: ${aErr.message}`);
    }
  }

  revalidatePath("/tasks");
  return successState("Đã tạo công việc.");
}

/** Cập nhật thông tin công việc (không đụng tới danh sách người tham gia / trạng thái). */
export async function updateTask(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");

  const id = cleanId(formData.get("id"));
  if (!id) return errorState("Thiếu mã công việc.");

  const parsed = parseTaskForm(formData);
  if (!parsed.success) {
    return errorState("Vui lòng kiểm tra lại thông tin.", zodFieldErrors(parsed.error));
  }
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      title: d.title,
      description: d.description || null,
      task_type: d.task_type,
      department_id: d.department_id,
      priority: d.priority,
      start_date: d.start_date || null,
      due_date: d.due_date || null,
      approver_id: cleanId(formData.get("approver_id")),
    })
    .eq("id", id);

  if (error) return errorState(error.message);

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
  return successState("Đã cập nhật công việc.");
}

/** Đổi trạng thái công việc theo ma trận chuyển hợp lệ (DB trigger kiểm tra lần nữa). */
export async function changeTaskStatus(
  taskId: string,
  from: TaskStatus,
  to: TaskStatus,
  note?: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");

  if (!canTransition(from, to)) {
    return errorState("Không thể chuyển sang trạng thái này.");
  }

  const payload: {
    status: TaskStatus;
    cancelled_reason?: string | null;
    revision_note?: string | null;
  } = { status: to };
  if (to === "cancelled") payload.cancelled_reason = note?.trim() || null;
  if (to === "needs_revision") payload.revision_note = note?.trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update(payload).eq("id", taskId);

  if (error) return errorState(error.message);

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
  return successState("Đã cập nhật trạng thái.");
}

/** Xoá công việc (người tạo hoặc Manager+ — RLS kiểm soát). */
export async function deleteTask(taskId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) return errorState(error.message);

  revalidatePath("/tasks");
  return successState("Đã xoá công việc.");
}

/** Thêm một người vào công việc. Chọn "lead" sẽ hạ người phụ trách chính cũ (nếu có). */
export async function addAssignee(
  taskId: string,
  userId: string,
  role: TaskParticipationRole,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");

  const supabase = await createClient();

  if (role === "lead") {
    // Mỗi task chỉ 1 lead → hạ lead hiện tại xuống collaborator trước.
    await supabase
      .from("task_assignees")
      .update({ participation_role: "collaborator" })
      .eq("task_id", taskId)
      .eq("participation_role", "lead");
  }

  // Nếu người này đã có trong task thì cập nhật vai trò, ngược lại thêm mới.
  const { data: existing } = await supabase
    .from("task_assignees")
    .select("id")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("task_assignees")
        .update({ participation_role: role })
        .eq("id", existing.id)
    : await supabase.from("task_assignees").insert({
        task_id: taskId,
        user_id: userId,
        participation_role: role,
        assigned_by: user.id,
      });

  if (error) return errorState(error.message);

  revalidatePath(`/tasks/${taskId}`);
  return successState("Đã cập nhật người tham gia.");
}

/** Gỡ một người khỏi công việc. */
export async function removeAssignee(
  assigneeId: string,
  taskId: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("task_assignees")
    .delete()
    .eq("id", assigneeId);

  if (error) return errorState(error.message);

  revalidatePath(`/tasks/${taskId}`);
  return successState("Đã gỡ người khỏi công việc.");
}
