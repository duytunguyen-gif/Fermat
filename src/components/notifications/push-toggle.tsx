"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  savePushSubscription,
  deletePushSubscription,
} from "@/lib/actions/push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

type State = "loading" | "unsupported" | "blocked" | "off" | "on";

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const supported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      if (!supported || !VAPID_PUBLIC_KEY) {
        if (!cancelled) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("blocked");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const existing = await reg.pushManager.getSubscription();
        if (!cancelled) setState(existing ? "on" : "off");
      } catch {
        if (!cancelled) setState("unsupported");
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        toast.error("Bạn chưa cho phép nhận thông báo.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          VAPID_PUBLIC_KEY,
        ) as BufferSource,
      });
      const json = sub.toJSON();
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        user_agent: navigator.userAgent,
      });
      if (res.status === "error") {
        toast.error(res.message);
        return;
      }
      setState("on");
      toast.success("Đã bật thông báo đẩy trên thiết bị này.");
    } catch (err) {
      toast.error("Không bật được thông báo", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("Đã tắt thông báo đẩy trên thiết bị này.");
    } catch (err) {
      toast.error("Không tắt được thông báo", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
          {state === "on" ? (
            <BellRing className="size-5" />
          ) : (
            <Bell className="size-5" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">Thông báo đẩy trên thiết bị này</p>
          <p className="text-muted-foreground text-sm">
            {state === "on"
              ? "Đang bật — bạn sẽ nhận thông báo ngay cả khi không mở app."
              : state === "blocked"
                ? "Trình duyệt đang chặn thông báo. Hãy vào cài đặt trình duyệt để cho phép."
                : state === "unsupported"
                  ? "Thiết bị/trình duyệt này chưa hỗ trợ. Trên iPhone cần 'Thêm vào màn hình chính' trước."
                  : "Bật để nhận thông báo giao việc, bình luận, duyệt… ngay trên điện thoại."}
          </p>
        </div>
      </div>

      <div className="shrink-0">
        {state === "on" ? (
          <Button variant="outline" onClick={disable} disabled={busy}>
            <BellOff className="size-4" />
            Tắt
          </Button>
        ) : (
          <Button
            onClick={enable}
            disabled={busy || state === "loading" || state === "unsupported" || state === "blocked"}
          >
            <BellRing className="size-4" />
            {busy ? "Đang bật…" : "Bật thông báo"}
          </Button>
        )}
      </div>
    </div>
  );
}
