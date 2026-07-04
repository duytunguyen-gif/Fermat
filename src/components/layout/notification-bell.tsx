"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Chuông thông báo ở header — hiện số chưa đọc. */
export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const display = unreadCount > 99 ? "99+" : String(unreadCount);
  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={
        unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Thông báo"
      }
    >
      <Link href="/notifications">
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="ring-background absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] leading-4 font-semibold text-white ring-2">
            {display}
          </span>
        )}
      </Link>
    </Button>
  );
}
