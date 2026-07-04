"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { changeTaskStatus } from "@/lib/actions/tasks";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_BADGE,
  TASK_STATUS_TRANSITIONS,
} from "@/lib/constants/task-status";
import type { TaskStatus } from "@/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Trạng thái cần kèm lý do/ghi chú khi chuyển tới. */
const NOTE_REQUIRED: Partial<Record<TaskStatus, { label: string; placeholder: string }>> = {
  cancelled: { label: "Lý do huỷ", placeholder: "Vì sao huỷ công việc này?" },
  needs_revision: {
    label: "Nội dung cần chỉnh sửa",
    placeholder: "Nêu rõ phần cần sửa để người thực hiện làm lại…",
  },
};

export function TaskStatusControl({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<TaskStatus | null>(null);
  const [note, setNote] = useState("");

  const nextStatuses = TASK_STATUS_TRANSITIONS[status] ?? [];

  function run(to: TaskStatus, noteText?: string) {
    startTransition(async () => {
      const res = await changeTaskStatus(taskId, status, to, noteText);
      if (res.status === "error") toast.error(res.message);
      else {
        toast.success(res.message);
        setTarget(null);
        setNote("");
      }
    });
  }

  function onClick(to: TaskStatus) {
    if (NOTE_REQUIRED[to]) setTarget(to);
    else run(to);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">Trạng thái:</span>
        <Badge variant="outline" className={TASK_STATUS_BADGE[status]}>
          {TASK_STATUS_LABELS[status]}
        </Badge>
      </div>

      {nextStatuses.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((to) => (
            <Button
              key={to}
              size="sm"
              variant={to === "cancelled" ? "outline" : "default"}
              disabled={pending}
              onClick={() => onClick(to)}
            >
              {TASK_STATUS_LABELS[to]}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Công việc đã đóng, không thể đổi trạng thái.
        </p>
      )}

      <Dialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {target ? TASK_STATUS_LABELS[target] : ""}
            </DialogTitle>
            <DialogDescription>
              {target && NOTE_REQUIRED[target]?.label}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="status-note">
              {target && NOTE_REQUIRED[target]?.label}
            </Label>
            <Textarea
              id="status-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={target ? NOTE_REQUIRED[target]?.placeholder : ""}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Huỷ
            </Button>
            <Button
              disabled={pending}
              onClick={() => target && run(target, note)}
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
