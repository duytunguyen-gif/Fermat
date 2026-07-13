import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  NotificationList,
  type NotificationItem,
} from "@/components/notifications/notification-list";
import { PushToggle } from "@/components/notifications/push-toggle";
import type { NotificationType } from "@/types/database.types";

export const metadata: Metadata = { title: "Thông báo" };

type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  task_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: { full_name: string } | null;
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("notifications")
    .select(
      "id, type, title, body, task_id, is_read, created_at, actor:users!notifications_actor_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const items: NotificationItem[] = ((raw ?? []) as unknown as NotificationRow[]).map(
    (n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      task_id: n.task_id,
      actor_name: n.actor?.full_name ?? null,
      is_read: n.is_read,
      created_at: n.created_at,
    }),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Thông báo</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Giao việc, đổi trạng thái, duyệt và cảnh báo sắp đến hạn / quá hạn.
      </p>
      <div className="mt-6">
        <PushToggle />
      </div>
      <div className="mt-6">
        <NotificationList items={items} />
      </div>
    </div>
  );
}
