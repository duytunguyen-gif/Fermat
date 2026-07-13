"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { type ActionState, errorState, successState } from "./action-result";

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
};

/** Lưu (hoặc cập nhật) đăng ký nhận thông báo đẩy của thiết bị hiện tại. */
export async function savePushSubscription(
  input: PushSubscriptionInput,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");
  if (!input.endpoint || !input.p256dh || !input.auth) {
    return errorState("Thiếu thông tin đăng ký thiết bị.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.user_agent ?? null,
    },
    { onConflict: "endpoint" },
  );

  if (error) return errorState(error.message);
  return successState("Đã bật thông báo đẩy trên thiết bị này.");
}

/** Xoá đăng ký của thiết bị hiện tại (tắt thông báo đẩy). */
export async function deletePushSubscription(
  endpoint: string,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) return errorState(error.message);
  return successState("Đã tắt thông báo đẩy trên thiết bị này.");
}
