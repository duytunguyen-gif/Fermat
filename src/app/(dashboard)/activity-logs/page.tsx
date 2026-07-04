import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { activityLabel } from "@/lib/constants/activity";
import type { ActivityAction, TaskStatus } from "@/types/database.types";
import {
  ActivityLogList,
  type ActivityItem,
} from "@/components/activity-logs/activity-log-list";

export const metadata: Metadata = { title: "Lịch sử thao tác" };

type ActivityRow = {
  id: string;
  action: ActivityAction;
  entity_type: string;
  task_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string } | null;
  task: { title: string } | null;
};

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function truncate(s: string, n = 140): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export default async function ActivityLogsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  // RLS mở cho user đang hoạt động (minh bạch truy trách nhiệm).
  const { data: rowsRaw } = await supabase
    .from("activity_logs")
    .select(
      "id, action, entity_type, task_id, before_data, after_data, created_at, actor:users!activity_logs_actor_id_fkey(full_name), task:tasks!activity_logs_task_id_fkey(title)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (rowsRaw ?? []) as unknown as ActivityRow[];

  const items: ActivityItem[] = rows.map((r) => {
    const before = r.before_data ?? {};
    const after = r.after_data ?? {};

    // Tiêu đề công việc: ưu tiên bản ghi join; nếu task đã xoá thì lấy từ snapshot.
    const taskTitle =
      r.task?.title ??
      (r.entity_type === "tasks"
        ? asString(after.title) ?? asString(before.title)
        : null);

    const fromStatus =
      r.action === "status_changed"
        ? (asString(before.status) as TaskStatus | null)
        : null;
    const toStatus =
      r.action === "status_changed"
        ? (asString(after.status) as TaskStatus | null)
        : null;

    // Trích nội dung bình luận để hiển thị nhanh.
    const snippet =
      r.entity_type === "task_comments"
        ? (() => {
            const c = asString(after.content) ?? asString(before.content);
            return c ? truncate(c) : null;
          })()
        : null;

    return {
      id: r.id,
      action: r.action,
      entity_type: r.entity_type,
      label: activityLabel(r.entity_type, r.action),
      actor_name: r.actor?.full_name ?? null,
      task_id: r.task_id,
      task_title: taskTitle,
      from_status: fromStatus,
      to_status: toStatus,
      snippet,
      created_at: r.created_at,
    };
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Lịch sử thao tác</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Nhật ký các thao tác trên hệ thống để truy trách nhiệm (200 hoạt động
        gần nhất).
      </p>

      <div className="mt-6">
        <ActivityLogList items={items} />
      </div>
    </div>
  );
}
