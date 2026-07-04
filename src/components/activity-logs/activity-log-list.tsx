"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Search } from "lucide-react";
import { activityMeta, ACTIVITY_ENTITY_FILTERS } from "@/lib/constants/activity";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_BADGE,
} from "@/lib/constants/task-status";
import type { ActivityAction, TaskStatus } from "@/types/database.types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ActivityItem = {
  id: string;
  action: ActivityAction;
  entity_type: string;
  label: string;
  actor_name: string | null;
  task_id: string | null;
  task_title: string | null;
  from_status: TaskStatus | null;
  to_status: TaskStatus | null;
  snippet: string | null;
  created_at: string;
};

function relativeTime(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: vi });
  } catch {
    return "";
  }
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={cn("text-xs", TASK_STATUS_BADGE[status])}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}

export function ActivityLogList({ items }: { items: ActivityItem[] }) {
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (entity !== "all" && it.entity_type !== entity) return false;
      if (needle) {
        const hay = `${it.label} ${it.task_title ?? ""} ${it.actor_name ?? ""} ${it.snippet ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [items, q, entity]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo công việc, người thao tác…"
            className="pl-9"
          />
        </div>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_ENTITY_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-muted-foreground text-sm">
        {filtered.length} / {items.length} thao tác
      </p>

      {filtered.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed py-16 text-center text-sm">
          {items.length === 0
            ? "Chưa có thao tác nào được ghi nhận."
            : "Không có thao tác khớp bộ lọc."}
        </div>
      ) : (
        <ol className="relative space-y-1">
          {filtered.map((it) => {
            const meta = activityMeta(it.action);
            const Icon = meta.icon;
            return (
              <li
                key={it.id}
                className="hover:bg-muted/50 flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors"
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                    meta.tone,
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium">{it.label}</span>
                    {it.action === "status_changed" &&
                      it.from_status &&
                      it.to_status && (
                        <span className="flex items-center gap-1">
                          <StatusBadge status={it.from_status} />
                          <span className="text-muted-foreground">→</span>
                          <StatusBadge status={it.to_status} />
                        </span>
                      )}
                  </div>

                  {it.task_title &&
                    (it.task_id ? (
                      <Link
                        href={`/tasks/${it.task_id}`}
                        className="text-muted-foreground hover:text-foreground mt-0.5 block truncate text-sm hover:underline"
                      >
                        {it.task_title}
                      </Link>
                    ) : (
                      <p className="text-muted-foreground mt-0.5 truncate text-sm">
                        {it.task_title}{" "}
                        <span className="text-xs">(đã xoá)</span>
                      </p>
                    ))}

                  {it.snippet && (
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm italic">
                      “{it.snippet}”
                    </p>
                  )}

                  <p className="text-muted-foreground mt-1 text-xs">
                    {it.actor_name ?? "Hệ thống"} · {relativeTime(it.created_at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
