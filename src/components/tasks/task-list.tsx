"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, AlertTriangle } from "lucide-react";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_BADGE,
  TASK_STATUS_ORDER,
  OPEN_STATUSES,
} from "@/lib/constants/task-status";
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_BADGE,
  TASK_PRIORITY_ORDER,
  TASK_TYPE_LABELS,
} from "@/lib/constants/task-priority";
import type {
  TaskStatus,
  TaskPriority,
  TaskType,
} from "@/types/database.types";
import { TaskForm, type DepartmentOption, type UserOption } from "./task-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type TaskListItem = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  task_type: TaskType;
  due_date: string | null;
  department_name: string | null;
  lead_name: string | null;
  assignee_count: number;
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function isOverdue(item: TaskListItem) {
  if (!item.due_date) return false;
  if (item.status === "completed" || item.status === "cancelled") return false;
  const today = new Date().toISOString().slice(0, 10);
  return item.due_date < today;
}

export function TaskList({
  tasks,
  departments,
  users,
  approvers,
  canCreate,
  initialStatus = "all",
  initialOverdue = false,
}: {
  tasks: TaskListItem[];
  departments: DepartmentOption[];
  users: UserOption[];
  approvers: UserOption[];
  canCreate: boolean;
  /** Bộ lọc trạng thái ban đầu (vd. khi mở từ thẻ trên Dashboard). "open" = mọi trạng thái đang mở. */
  initialStatus?: TaskStatus | "all" | "open";
  initialOverdue?: boolean;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<TaskStatus | "all" | "open">(
    initialStatus,
  );
  const [priority, setPriority] = useState<TaskPriority | "all">("all");
  const [overdueOnly, setOverdueOnly] = useState(initialOverdue);

  const overdueCount = useMemo(() => tasks.filter(isOverdue).length, [tasks]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tasks.filter((t) => {
      if (overdueOnly && !isOverdue(t)) return false;
      if (status === "open") {
        if (!OPEN_STATUSES.includes(t.status)) return false;
      } else if (status !== "all" && t.status !== status) {
        return false;
      }
      if (priority !== "all" && t.priority !== priority) return false;
      if (needle && !t.title.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [tasks, q, status, priority, overdueOnly]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          {filtered.length} / {tasks.length} công việc
        </p>
        {canCreate && (
          <TaskForm
            departments={departments}
            users={users}
            approvers={approvers}
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                Tạo công việc
              </Button>
            }
          />
        )}
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tiêu đề…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus | "all" | "open")}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="open">Đang mở (chưa đóng)</SelectItem>
            {TASK_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority | "all")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi độ ưu tiên</SelectItem>
            {TASK_PRIORITY_ORDER.map((p) => (
              <SelectItem key={p} value={p}>
                {TASK_PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={overdueOnly ? "default" : "outline"}
          className={cn(
            "w-full sm:w-auto",
            overdueOnly && "bg-rose-600 hover:bg-rose-700",
          )}
          onClick={() => setOverdueOnly((v) => !v)}
        >
          <AlertTriangle className="size-4" />
          Quá hạn{overdueCount > 0 ? ` (${overdueCount})` : ""}
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Công việc</TableHead>
              <TableHead className="hidden md:table-cell">Phòng ban</TableHead>
              <TableHead className="hidden lg:table-cell">Phụ trách</TableHead>
              <TableHead className="text-center">Ưu tiên</TableHead>
              <TableHead className="text-center">Trạng thái</TableHead>
              <TableHead className="text-center">Hạn chót</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                  {tasks.length === 0
                    ? "Chưa có công việc nào. Bấm “Tạo công việc” để bắt đầu."
                    : "Không có công việc khớp bộ lọc."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow key={t.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/tasks/${t.id}`} className="hover:underline">
                      {t.title}
                    </Link>
                    <span className="text-muted-foreground block text-xs">
                      {TASK_TYPE_LABELS[t.task_type]}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {t.department_name ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {t.lead_name ?? (
                      <span className="text-muted-foreground">Chưa giao</span>
                    )}
                    {t.assignee_count > 1 && (
                      <span className="text-muted-foreground text-xs">
                        {" "}
                        +{t.assignee_count - 1}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={TASK_PRIORITY_BADGE[t.priority]}>
                      {TASK_PRIORITY_LABELS[t.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={TASK_STATUS_BADGE[t.status]}>
                      {TASK_STATUS_LABELS[t.status]}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-center text-sm tabular-nums",
                      isOverdue(t) && "text-destructive font-medium",
                    )}
                  >
                    {formatDate(t.due_date)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
