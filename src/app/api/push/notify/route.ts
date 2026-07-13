import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Nhận yêu cầu gửi thông báo đẩy (được gọi từ trigger DB pg_net khi có
 * notifications mới). Tải đăng ký thiết bị của người nhận và gửi Web Push.
 * Bảo vệ bằng header `x-push-secret` khớp PUSH_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-push-secret");
  const expected = process.env.PUSH_WEBHOOK_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@fermat.edu.vn";
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: "VAPID chưa cấu hình" }, { status: 500 });
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  let notificationId: string | undefined;
  try {
    const parsed = await request.json();
    notificationId = parsed?.notification_id;
  } catch {
    return NextResponse.json({ error: "body không hợp lệ" }, { status: 400 });
  }
  if (!notificationId) {
    return NextResponse.json({ error: "thiếu notification_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: notif } = await admin
    .from("notifications")
    .select("id, recipient_id, title, body, task_id")
    .eq("id", notificationId)
    .maybeSingle();

  if (!notif) {
    return NextResponse.json({ error: "không tìm thấy thông báo" }, { status: 404 });
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", notif.recipient_id);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0, note: "người nhận chưa bật thông báo đẩy" });
  }

  const payload = JSON.stringify({
    title: notif.title || "Fermat Tech",
    body: notif.body || "Nhấn để xem chi tiết.",
    url: notif.task_id ? `/tasks/${notif.task_id}` : "/notifications",
    icon: "/icons/icon-192.png",
    tag: `notif-${notif.id}`,
  });

  let sent = 0;
  const staleEndpoints: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent += 1;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        // 404/410: đăng ký đã hết hiệu lực → dọn khỏi DB.
        if (code === 404 || code === 410) staleEndpoints.push(s.endpoint);
      }
    }),
  );

  if (staleEndpoints.length > 0) {
    await admin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", staleEndpoints);
  }

  return NextResponse.json({ sent, cleaned: staleEndpoints.length });
}
