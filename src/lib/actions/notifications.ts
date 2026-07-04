"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { type ActionState, errorState, successState } from "./action-result";

/** Đánh dấu MỘT thông báo là đã đọc (RLS chỉ cho phép thao tác trên thông báo của mình). */
export async function markNotificationRead(id: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("recipient_id", user.id);

  if (error) return errorState(error.message);

  revalidatePath("/notifications");
  return successState();
}

/** Đánh dấu MỘT thông báo là chưa đọc. */
export async function markNotificationUnread(id: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: false })
    .eq("id", id)
    .eq("recipient_id", user.id);

  if (error) return errorState(error.message);

  revalidatePath("/notifications");
  return successState();
}

/** Đánh dấu TẤT CẢ thông báo của mình là đã đọc. */
export async function markAllNotificationsRead(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_id", user.id)
    .eq("is_read", false);

  if (error) return errorState(error.message);

  revalidatePath("/notifications");
  return successState("Đã đánh dấu tất cả là đã đọc.");
}
