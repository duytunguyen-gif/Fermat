"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { saveDailyUpdate } from "@/lib/actions/task-activity";
import { IDLE_STATE } from "@/lib/actions/action-result";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type DailyUpdateItem = {
  id: string;
  user_name: string;
  update_date: string;
  progress_percent: number | null;
  content: string;
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase();
}

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function TaskDailyUpdates({
  taskId,
  updates,
  canReport,
}: {
  taskId: string;
  updates: DailyUpdateItem[];
  canReport: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveDailyUpdate, IDLE_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      formRef.current?.reset();
    } else if (state.status === "error" && !state.fieldErrors) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <div className="space-y-4">
      {canReport ? (
        <form ref={formRef} action={formAction} className="space-y-3 rounded-lg border p-3">
          <input type="hidden" name="task_id" value={taskId} />
          <div className="space-y-1.5">
            <Label htmlFor="du-content">Báo cáo tiến độ hôm nay</Label>
            <Textarea
              id="du-content"
              name="content"
              rows={2}
              placeholder="Hôm nay bạn đã làm được gì?"
            />
            {state.fieldErrors?.content && (
              <p className="text-destructive text-sm">{state.fieldErrors.content}</p>
            )}
          </div>
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="du-progress">Tiến độ (%)</Label>
              <Input
                id="du-progress"
                name="progress_percent"
                type="number"
                min={0}
                max={100}
                placeholder="0–100"
                className="w-28"
              />
            </div>
            <Button type="submit" disabled={pending} className="ml-auto">
              {pending ? "Đang gửi…" : "Gửi báo cáo"}
            </Button>
          </div>
          {state.fieldErrors?.progress_percent && (
            <p className="text-destructive text-sm">{state.fieldErrors.progress_percent}</p>
          )}
          <p className="text-muted-foreground text-xs">
            Mỗi ngày một báo cáo — gửi lại sẽ cập nhật báo cáo hôm nay.
          </p>
        </form>
      ) : (
        <p className="text-muted-foreground text-sm">
          Chỉ người được giao việc mới gửi báo cáo tiến độ.
        </p>
      )}

      {updates.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có báo cáo tiến độ nào.</p>
      ) : (
        <ul className="space-y-3">
          {updates.map((u) => (
            <li key={u.id} className="flex gap-3">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="text-xs">{initials(u.user_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{u.user_name}</span>
                  <span className="text-muted-foreground text-xs">{fmtDate(u.update_date)}</span>
                  {u.progress_percent !== null && (
                    <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-700">
                      {u.progress_percent}%
                    </span>
                  )}
                </div>
                {u.progress_percent !== null && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{ width: `${u.progress_percent}%` }}
                    />
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{u.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
