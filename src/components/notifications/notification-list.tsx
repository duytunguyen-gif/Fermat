"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/actions/notifications";
import { notificationMeta, notificationHref } from "@/lib/constants/notification";
import type { NotificationType } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  task_id: string | null;
  actor_name: string | null;
  is_read: boolean;
  created_at: string;
};

function relativeTime(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: vi });
  } catch {
    return "";
  }
}

export function NotificationList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = useMemo(
    () => items.filter((n) => !n.is_read).length,
    [items],
  );

  const visible = useMemo(
    () => (filter === "unread" ? items.filter((n) => !n.is_read) : items),
    [items, filter],
  );

  function openNotification(n: NotificationItem) {
    const go = () => router.push(notificationHref(n.task_id));
    if (n.is_read) {
      go();
      return;
    }
    startTransition(async () => {
      await markNotificationRead(n.id);
      go();
    });
  }

  function markAll() {
    startTransition(async () => {
      const res = await markAllNotificationsRead();
      if (res.status === "error") toast.error(res.message);
      else toast.success(res.message ?? "Đã cập nhật.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="bg-muted inline-flex rounded-lg p-1">
          <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
            Tất cả
          </FilterTab>
          <FilterTab
            active={filter === "unread"}
            onClick={() => setFilter("unread")}
          >
            Chưa đọc{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </FilterTab>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={markAll}
          disabled={pending || unreadCount === 0}
        >
          <CheckCheck className="size-4" />
          Đánh dấu tất cả đã đọc
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed py-16 text-center text-sm">
          {filter === "unread"
            ? "Bạn đã đọc hết thông báo."
            : "Chưa có thông báo nào."}
        </div>
      ) : (
        <ul className="divide-border overflow-hidden rounded-lg border">
          {visible.map((n) => {
            const meta = notificationMeta(n.type);
            const Icon = meta.icon;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openNotification(n)}
                  disabled={pending}
                  className={cn(
                    "hover:bg-muted/60 flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0",
                    !n.is_read && "bg-blue-50/60",
                  )}
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
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        !n.is_read ? "font-semibold" : "font-medium",
                      )}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                        {n.body}
                      </p>
                    )}
                    <p className="text-muted-foreground mt-1 text-xs">
                      {meta.label}
                      {n.actor_name ? ` · ${n.actor_name}` : ""} ·{" "}
                      {relativeTime(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
