import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ListTodo,
  Loader2,
  ClipboardCheck,
  AlertTriangle,
  ChevronRight,
  CalendarClock,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ROLE_LABELS } from "@/lib/constants/roles";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_ORDER,
  TASK_STATUS_CHART_COLOR,
  OPEN_STATUSES,
} from "@/lib/constants/task-status";
import { dueState, DUE_BADGE } from "@/lib/utils/due";
import type { TaskStatus, TaskPriority } from "@/types/database.types";
import {
  StatusDonut,
  DepartmentBar,
} from "@/components/dashboard/dashboard-charts-lazy";
import type {
  StatusSlice,
  DepartmentBarItem,
} from "@/components/dashboard/dashboard-charts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tổng quan" };

type DashboardTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  approver_id: string | null;
  department: { name: string } | null;
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  // RLS tự giới hạn phạm vi công việc người dùng được xem → mọi số liệu
  // dưới đây đã đúng theo quyền của từng người.
  const { data: tasksRaw } = await supabase
    .from("tasks")
    .select(
      "id, title, status, priority, due_date, approver_id, department:departments(name)",
    )
    .order("due_date", { ascending: true, nullsFirst: false });

  const tasks = (tasksRaw ?? []) as unknown as DashboardTask[];

  // ---- Số liệu tổng ----
  const openTasks = tasks.filter((t) => OPEN_STATUSES.includes(t.status));
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const pendingApprovalCount = tasks.filter(
    (t) => t.status === "pending_approval",
  ).length;

  const overdueTasks = tasks.filter(
    (t) => dueState(t.due_date, t.status) === "overdue",
  );
  const dueSoonTasks = tasks.filter(
    (t) => dueState(t.due_date, t.status) === "due_soon",
  );

  const stats = [
    {
      label: "Công việc đang mở",
      value: openTasks.length,
      icon: ListTodo,
      tint: "bg-slate-100 text-slate-600",
      href: "/tasks?status=open",
    },
    {
      label: "Đang xử lý",
      value: inProgress,
      icon: Loader2,
      tint: "bg-blue-50 text-blue-600",
      href: "/tasks?status=in_progress",
    },
    {
      label: "Chờ duyệt",
      value: pendingApprovalCount,
      icon: ClipboardCheck,
      tint: "bg-violet-50 text-violet-600",
      href: "/tasks?status=pending_approval",
    },
    {
      label: "Quá hạn",
      value: overdueTasks.length,
      icon: AlertTriangle,
      tint: "bg-rose-50 text-rose-600",
      href: "/tasks?overdue=1",
    },
  ];

  // ---- Dữ liệu biểu đồ trạng thái (chỉ trạng thái có việc) ----
  const statusCounts = new Map<TaskStatus, number>();
  for (const t of tasks) {
    statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1);
  }
  const statusData: StatusSlice[] = TASK_STATUS_ORDER.filter(
    (s) => (statusCounts.get(s) ?? 0) > 0,
  ).map((s) => ({
    name: TASK_STATUS_LABELS[s],
    value: statusCounts.get(s) ?? 0,
    color: TASK_STATUS_CHART_COLOR[s],
  }));

  // ---- Dữ liệu biểu đồ phòng ban (việc đang mở) ----
  const deptCounts = new Map<string, number>();
  for (const t of openTasks) {
    const name = t.department?.name ?? "Chưa rõ";
    deptCounts.set(name, (deptCounts.get(name) ?? 0) + 1);
  }
  const departmentData: DepartmentBarItem[] = [...deptCounts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // ---- Việc cần chú ý ----
  const attention = [...overdueTasks, ...dueSoonTasks].slice(0, 6);
  const needsApproval = tasks
    .filter((t) => t.approver_id === user.id && t.status === "pending_approval")
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Xin chào, {user.full_name} 👋
      </h1>
      <p className="text-muted-foreground mt-1.5 text-sm">
        {ROLE_LABELS[user.system_role]}
        {user.department?.name ? ` · ${user.department.name}` : ""}
      </p>

      {/* Thẻ số liệu */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="focus-visible:ring-ring/50 group rounded-2xl outline-none focus-visible:ring-2"
          >
            <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md">
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm font-medium">
                    {s.label}
                  </span>
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full",
                      s.tint,
                    )}
                  >
                    <s.icon className="size-5" />
                  </span>
                </div>
                <p className="text-4xl font-bold tracking-tight tabular-nums">
                  {s.value}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Biểu đồ */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Phân bố theo trạng thái
            </CardTitle>
            <CardDescription>Tỷ lệ công việc theo từng trạng thái.</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusDonut data={statusData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Việc đang mở theo phòng ban
            </CardTitle>
            <CardDescription>
              Số công việc chưa đóng ở mỗi phòng ban.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DepartmentBar data={departmentData} />
          </CardContent>
        </Card>
      </div>

      {/* Việc cần chú ý */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CalendarClock className="size-5 text-rose-600" />
              Quá hạn &amp; sắp đến hạn
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {attention.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="size-6" />
                </span>
                <div>
                  <p className="text-sm font-medium">Mọi việc đều đúng hạn</p>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    Không có việc nào quá hạn hay sắp đến hạn. 🎉
                  </p>
                </div>
              </div>
            ) : (
              attention.map((t) => {
                const ds = dueState(t.due_date, t.status);
                const badge =
                  ds === "overdue" || ds === "due_soon" ? DUE_BADGE[ds] : null;
                return (
                  <Link
                    key={t.id}
                    href={`/tasks/${t.id}`}
                    className="hover:bg-accent group/item flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {t.title}
                    </span>
                    {badge && (
                      <Badge variant="outline" className={badge.className}>
                        {badge.label}
                      </Badge>
                    )}
                    <span className="text-muted-foreground hidden shrink-0 tabular-nums sm:inline">
                      {formatDate(t.due_date)}
                    </span>
                    <ChevronRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover/item:translate-x-0.5" />
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ClipboardCheck className="size-5 text-violet-600" />
              Cần bạn duyệt ({needsApproval.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            {needsApproval.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
                  <Inbox className="size-6" />
                </span>
                <div>
                  <p className="text-sm font-medium">Không có việc chờ duyệt</p>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    Các việc cần bạn duyệt sẽ xuất hiện ở đây.
                  </p>
                </div>
              </div>
            ) : (
              needsApproval.map((t) => (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="hover:bg-accent group/item flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {t.title}
                  </span>
                  <span className="text-muted-foreground hidden shrink-0 sm:inline">
                    {t.department?.name ?? "—"}
                  </span>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover/item:translate-x-0.5" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
