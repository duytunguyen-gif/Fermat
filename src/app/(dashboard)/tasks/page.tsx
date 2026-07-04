import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { TASK_STATUS_ORDER } from "@/lib/constants/task-status";
import { TaskList, type TaskListItem } from "@/components/tasks/task-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Công việc" };

const APPROVER_ROLES = ["super_admin", "admin", "executive", "manager"];

type TaskRow = {
  id: string;
  title: string;
  status: TaskListItem["status"];
  priority: TaskListItem["priority"];
  task_type: TaskListItem["task_type"];
  due_date: string | null;
  department: { name: string } | null;
  assignees: { participation_role: "lead" | "collaborator"; user: { full_name: string } | null }[];
};

const VALID_STATUS_FILTERS = [...TASK_STATUS_ORDER, "open"];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; overdue?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const initialStatus = VALID_STATUS_FILTERS.includes(sp.status ?? "")
    ? (sp.status as TaskListItem["status"] | "open")
    : "all";
  const initialOverdue = sp.overdue === "1" || sp.overdue === "true";

  const supabase = await createClient();
  const [
    { data: tasksRaw },
    { data: departments },
    { data: usersRaw },
    { data: pendingRaw },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, status, priority, task_type, due_date, department:departments(name), assignees:task_assignees(participation_role, user:users!task_assignees_user_id_fkey(full_name))",
      )
      .order("created_at", { ascending: false }),
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
    // Việc đang chờ CHÍNH tôi duyệt.
    supabase
      .from("tasks")
      .select("id, title, department:departments(name)")
      .eq("approver_id", user.id)
      .eq("status", "pending_approval")
      .order("updated_at", { ascending: false }),
  ]);

  type PendingRow = { id: string; title: string; department: { name: string } | null };
  const pendingApproval = (pendingRaw ?? []) as unknown as PendingRow[];

  const tasks: TaskListItem[] = ((tasksRaw ?? []) as unknown as TaskRow[]).map(
    (t) => {
      const lead = t.assignees?.find((a) => a.participation_role === "lead");
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        task_type: t.task_type,
        due_date: t.due_date,
        department_name: t.department?.name ?? null,
        lead_name: lead?.user?.full_name ?? null,
        assignee_count: t.assignees?.length ?? 0,
      };
    },
  );

  const users = (usersRaw ?? []).map((u) => ({
    id: u.id,
    full_name: u.full_name,
  }));
  const approvers = (usersRaw ?? [])
    .filter((u) => APPROVER_ROLES.includes(u.system_role))
    .map((u) => ({ id: u.id, full_name: u.full_name }));

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">Công việc</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Tạo, giao và theo dõi công việc trong công ty.
      </p>

      {pendingApproval.length > 0 && (
        <Card className="mt-6 border-violet-200 bg-violet-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-violet-800">
              <ClipboardCheck className="size-5" />
              Cần bạn duyệt ({pendingApproval.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {pendingApproval.map((t) => (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className="hover:bg-violet-100/60 flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors"
              >
                <span className="min-w-0 flex-1 truncate font-medium">
                  {t.title}
                </span>
                <span className="text-muted-foreground hidden shrink-0 sm:inline">
                  {t.department?.name ?? "—"}
                </span>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-6">
        <TaskList
          tasks={tasks}
          departments={departments ?? []}
          users={users}
          approvers={approvers}
          canCreate
          initialStatus={initialStatus}
          initialOverdue={initialOverdue}
        />
      </div>
    </div>
  );
}
