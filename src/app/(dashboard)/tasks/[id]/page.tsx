import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canAssignTask, isAdminOrAbove } from "@/lib/auth/permissions";
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_BADGE,
  TASK_TYPE_LABELS,
} from "@/lib/constants/task-priority";
import { dueState, DUE_BADGE } from "@/lib/utils/due";
import type { Database, TaskParticipationRole } from "@/types/database.types";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskStatusControl } from "@/components/tasks/task-status-control";
import { TaskAssignees, type AssigneeItem } from "@/components/tasks/task-assignees";
import { TaskDeleteButton } from "@/components/tasks/task-delete-button";
import { TaskActivityTabs } from "@/components/tasks/task-activity-tabs";
import type { DailyUpdateItem } from "@/components/tasks/task-daily-updates";
import type { CommentItem } from "@/components/tasks/task-comments";
import type { AttachmentItem } from "@/components/tasks/task-attachments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Chi tiết công việc" };

const APPROVER_ROLES = ["super_admin", "admin", "executive", "manager"];

type TaskDetail = Database["public"]["Tables"]["tasks"]["Row"] & {
  department: { name: string } | null;
  creator: { full_name: string } | null;
  approver: { full_name: string } | null;
  assignees: {
    id: string;
    user_id: string;
    participation_role: TaskParticipationRole;
    user: { full_name: string } | null;
  }[];
};

function fmt(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: taskRaw } = await supabase
    .from("tasks")
    .select(
      "*, department:departments(name), creator:users!tasks_created_by_fkey(full_name), approver:users!tasks_approver_id_fkey(full_name), assignees:task_assignees(id, user_id, participation_role, user:users!task_assignees_user_id_fkey(full_name))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!taskRaw) notFound();
  const task = taskRaw as unknown as TaskDetail;
  const due = dueState(task.due_date, task.status);

  const [
    { data: departments },
    { data: usersRaw },
    { data: updatesRaw },
    { data: commentsRaw },
    { data: attachmentsRaw },
  ] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("users")
      .select("id, full_name, system_role")
      .eq("account_status", "active")
      .order("full_name"),
    supabase
      .from("task_daily_updates")
      .select("id, update_date, progress_percent, content, user:users(full_name)")
      .eq("task_id", id)
      .order("update_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("task_comments")
      .select("id, user_id, content, created_at, updated_at, user:users(full_name)")
      .eq("task_id", id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("task_attachments")
      .select(
        "id, uploaded_by, attachment_type, file_name, url, file_path, file_size_bytes, created_at, uploader:users(full_name)",
      )
      .eq("task_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const users = (usersRaw ?? []).map((u) => ({ id: u.id, full_name: u.full_name }));
  const approvers = (usersRaw ?? [])
    .filter((u) => APPROVER_ROLES.includes(u.system_role))
    .map((u) => ({ id: u.id, full_name: u.full_name }));

  const assignees: AssigneeItem[] = (task.assignees ?? []).map((a) => ({
    id: a.id,
    user_id: a.user_id,
    full_name: a.user?.full_name ?? "(không rõ)",
    participation_role: a.participation_role,
  }));

  const isCreator = task.created_by === user.id;
  const isApprover = task.approver_id === user.id;
  const isAssignee = assignees.some((a) => a.user_id === user.id);
  const canAssign = canAssignTask(user.system_role);
  const canEdit = canAssign || isCreator || isApprover || isAssignee;
  const canManageAssignees = canAssign || isCreator;
  const canDelete = canAssign || isCreator;
  const isAdmin = isAdminOrAbove(user.system_role);

  // ----- Dữ liệu tab hoạt động (tiến độ / bình luận / tệp) -----
  type UpdateRow = {
    id: string;
    update_date: string;
    progress_percent: number | null;
    content: string;
    user: { full_name: string } | null;
  };
  const updates: DailyUpdateItem[] = ((updatesRaw ?? []) as unknown as UpdateRow[]).map(
    (u) => ({
      id: u.id,
      user_name: u.user?.full_name ?? "(không rõ)",
      update_date: u.update_date,
      progress_percent: u.progress_percent,
      content: u.content,
    }),
  );

  type CommentRow = {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    updated_at: string;
    user: { full_name: string } | null;
  };
  const comments: CommentItem[] = ((commentsRaw ?? []) as unknown as CommentRow[]).map(
    (c) => ({
      id: c.id,
      user_id: c.user_id,
      user_name: c.user?.full_name ?? "(không rõ)",
      content: c.content,
      created_at: c.created_at,
      edited: c.updated_at !== c.created_at,
    }),
  );

  type AttachmentRow = {
    id: string;
    uploaded_by: string;
    attachment_type: "file" | "link";
    file_name: string | null;
    url: string | null;
    file_path: string | null;
    file_size_bytes: number | null;
    created_at: string;
    uploader: { full_name: string } | null;
  };
  const attachmentRows = (attachmentsRaw ?? []) as unknown as AttachmentRow[];

  // URL tải xuống tạm thời cho các tệp lưu ở Storage.
  const filePaths = attachmentRows
    .filter((a) => a.attachment_type === "file" && a.file_path)
    .map((a) => a.file_path as string);
  const signedByPath = new Map<string, string>();
  if (filePaths.length > 0) {
    const { data: signed } = await createAdminClient()
      .storage.from("task-files")
      .createSignedUrls(filePaths, 60 * 60);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);
    }
  }

  const attachments: AttachmentItem[] = attachmentRows.map((a) => ({
    id: a.id,
    uploaded_by: a.uploaded_by,
    uploader_name: a.uploader?.full_name ?? "(không rõ)",
    attachment_type: a.attachment_type,
    file_name: a.file_name,
    href:
      a.attachment_type === "file"
        ? (a.file_path ? signedByPath.get(a.file_path) ?? null : null)
        : a.url,
    file_size_bytes: a.file_size_bytes,
    created_at: a.created_at,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/tasks">
            <ArrowLeft className="size-4" />
            Danh sách công việc
          </Link>
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={TASK_PRIORITY_BADGE[task.priority]}>
                {TASK_PRIORITY_LABELS[task.priority]}
              </Badge>
              <Badge variant="secondary">{TASK_TYPE_LABELS[task.task_type]}</Badge>
              {due !== "none" && due !== "ok" && (
                <Badge variant="outline" className={DUE_BADGE[due].className}>
                  {DUE_BADGE[due].label}
                </Badge>
              )}
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <TaskForm
                task={task}
                departments={departments ?? []}
                users={users}
                approvers={approvers}
                trigger={
                  <Button size="sm" variant="outline">
                    <Pencil className="size-4" />
                    Sửa
                  </Button>
                }
              />
              {canDelete && <TaskDeleteButton taskId={task.id} />}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mô tả</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <p className="text-sm whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="text-muted-foreground text-sm">Không có mô tả.</p>
              )}
              {task.status === "needs_revision" && task.revision_note && (
                <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                  <strong>Cần chỉnh sửa:</strong> {task.revision_note}
                </div>
              )}
              {task.status === "cancelled" && task.cancelled_reason && (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  <strong>Lý do huỷ:</strong> {task.cancelled_reason}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Người tham gia</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskAssignees
                taskId={task.id}
                assignees={assignees}
                users={users}
                canManage={canManageAssignees}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <TaskActivityTabs
                taskId={task.id}
                updates={updates}
                comments={comments}
                attachments={attachments}
                currentUserId={user.id}
                isAdmin={isAdmin}
                canReport={isAssignee}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trạng thái</CardTitle>
            </CardHeader>
            <CardContent>
              {canEdit ? (
                <TaskStatusControl taskId={task.id} status={task.status} />
              ) : (
                <Badge variant="outline">{task.status}</Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thông tin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="Phòng ban" value={task.department?.name ?? "—"} />
              <InfoRow label="Ngày bắt đầu" value={fmt(task.start_date)} />
              <InfoRow label="Hạn chót" value={fmt(task.due_date)} />
              <InfoRow label="Người tạo" value={task.creator?.full_name ?? "—"} />
              <InfoRow
                label="Người duyệt"
                value={task.approver?.full_name ?? "Chưa chọn"}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
