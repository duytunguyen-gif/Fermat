"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { IDLE_STATE } from "@/lib/actions/action-result";
import {
  TASK_TYPE_LABELS,
  TASK_TYPE_ORDER,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_ORDER,
} from "@/lib/constants/task-priority";
import type { Database } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type UserOption = { id: string; full_name: string };
export type DepartmentOption = { id: string; name: string };

/** Bản nháp công việc đang soạn — mọi trường trong form. */
type TaskDraft = {
  title: string;
  description: string;
  department_id: string;
  task_type: string;
  priority: string;
  approver_id: string;
  start_date: string;
  due_date: string;
  lead_id: string;
  collaborator_ids: string[];
};

const DRAFT_STORAGE_KEY = "femattech:task-draft:create";

function emptyDraft(defaultDepartmentId?: string | null): TaskDraft {
  return {
    title: "",
    description: "",
    department_id: defaultDepartmentId ?? "",
    task_type: "ad_hoc",
    priority: "normal",
    approver_id: "none",
    start_date: "",
    due_date: "",
    lead_id: "none",
    collaborator_ids: [],
  };
}

function draftFromTask(task: Task): TaskDraft {
  return {
    title: task.title ?? "",
    description: task.description ?? "",
    department_id: task.department_id ?? "",
    task_type: task.task_type ?? "ad_hoc",
    priority: task.priority ?? "normal",
    approver_id: task.approver_id ?? "none",
    start_date: task.start_date ?? "",
    due_date: task.due_date ?? "",
    lead_id: "none",
    collaborator_ids: [],
  };
}

/** Có nội dung đáng kể để coi là "nháp đã lưu" hay không. */
function isMeaningfulDraft(d: TaskDraft): boolean {
  return Boolean(
    d.title.trim() ||
      d.description.trim() ||
      d.department_id ||
      d.start_date ||
      d.due_date ||
      d.approver_id !== "none" ||
      d.lead_id !== "none" ||
      d.collaborator_ids.length > 0,
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-destructive text-sm">{msg}</p>;
}

export function TaskForm({
  task,
  departments,
  users,
  approvers,
  defaultDepartmentId,
  trigger,
}: {
  task?: Task;
  departments: DepartmentOption[];
  users: UserOption[];
  approvers: UserOption[];
  defaultDepartmentId?: string | null;
  trigger: React.ReactNode;
}) {
  const isEdit = Boolean(task);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(() =>
    task ? draftFromTask(task) : emptyDraft(defaultDepartmentId),
  );
  const [hydrated, setHydrated] = useState(false);
  const [restored, setRestored] = useState(false);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateTask : createTask,
    IDLE_STATE,
  );

  const set = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function toggleCollaborator(id: string, checked: boolean) {
    setDraft((d) => ({
      ...d,
      collaborator_ids: checked
        ? [...d.collaborator_ids, id]
        : d.collaborator_ids.filter((x) => x !== id),
    }));
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      /* bỏ qua nếu trình duyệt chặn localStorage */
    }
    setDraft(emptyDraft(defaultDepartmentId));
    setRestored(false);
  }

  // Khi mở hộp thoại: sửa → nạp lại từ việc; tạo mới → khôi phục nháp đã lưu.
  useEffect(() => {
    if (!open) {
      setHydrated(false);
      setRestored(false);
      return;
    }
    if (isEdit && task) {
      setDraft(draftFromTask(task));
      return;
    }
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const saved = { ...emptyDraft(defaultDepartmentId), ...JSON.parse(raw) };
        setDraft(saved);
        setRestored(isMeaningfulDraft(saved));
      } else {
        setDraft(emptyDraft(defaultDepartmentId));
      }
    } catch {
      setDraft(emptyDraft(defaultDepartmentId));
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Tự lưu nháp mỗi khi có thay đổi (chỉ khi tạo mới & đã khôi phục xong).
  useEffect(() => {
    if (isEdit || !open || !hydrated) return;
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* bỏ qua nếu trình duyệt chặn localStorage */
    }
  }, [draft, isEdit, open, hydrated]);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      if (!isEdit) {
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {
          /* bỏ qua */
        }
        setDraft(emptyDraft(defaultDepartmentId));
      }
      setOpen(false);
    } else if (state.status === "error" && !state.fieldErrors) {
      toast.error(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa công việc" : "Tạo công việc"}</DialogTitle>
          <DialogDescription>
            Điền thông tin công việc. Các trường có dấu * là bắt buộc.
          </DialogDescription>
        </DialogHeader>

        {!isEdit && restored && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <span>Đã khôi phục nội dung bạn nhập dở trước đó.</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
              onClick={clearDraft}
            >
              <RotateCcw className="size-3.5" />
              Nhập lại từ đầu
            </Button>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          {task && <input type="hidden" name="id" value={task.id} />}

          <div className="space-y-2">
            <Label htmlFor="title">Tiêu đề *</Label>
            <Input
              id="title"
              name="title"
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="VD: Chuẩn bị đề thi học kỳ 1"
              required
            />
            <FieldError msg={state.fieldErrors?.title} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              name="description"
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Nội dung chi tiết, yêu cầu, ghi chú…"
              rows={3}
            />
            <FieldError msg={state.fieldErrors?.description} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="department_id">Phòng ban *</Label>
              <Select
                name="department_id"
                value={draft.department_id || undefined}
                onValueChange={(v) => set("department_id", v)}
              >
                <SelectTrigger id="department_id" className="w-full">
                  <SelectValue placeholder="Chọn phòng ban" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError msg={state.fieldErrors?.department_id} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task_type">Loại việc</Label>
              <Select
                name="task_type"
                value={draft.task_type}
                onValueChange={(v) => set("task_type", v)}
              >
                <SelectTrigger id="task_type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPE_ORDER.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TASK_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Độ ưu tiên</Label>
              <Select
                name="priority"
                value={draft.priority}
                onValueChange={(v) => set("priority", v)}
              >
                <SelectTrigger id="priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITY_ORDER.map((p) => (
                    <SelectItem key={p} value={p}>
                      {TASK_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approver_id">Người duyệt</Label>
              <Select
                name="approver_id"
                value={draft.approver_id}
                onValueChange={(v) => set("approver_id", v)}
              >
                <SelectTrigger id="approver_id" className="w-full">
                  <SelectValue placeholder="Chọn người duyệt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Chưa chọn —</SelectItem>
                  {approvers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Ngày bắt đầu</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                value={draft.start_date}
                onChange={(e) => set("start_date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Hạn chót</Label>
              <Input
                id="due_date"
                name="due_date"
                type="date"
                value={draft.due_date}
                onChange={(e) => set("due_date", e.target.value)}
              />
              <FieldError msg={state.fieldErrors?.due_date} />
            </div>
          </div>

          {/* Người tham gia chỉ chọn khi TẠO mới; khi sửa thì quản lý ở trang chi tiết. */}
          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label htmlFor="lead_id">Người phụ trách chính</Label>
                <Select
                  name="lead_id"
                  value={draft.lead_id}
                  onValueChange={(v) => set("lead_id", v)}
                >
                  <SelectTrigger id="lead_id" className="w-full">
                    <SelectValue placeholder="Chọn người phụ trách" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Chưa chọn —</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Người phối hợp</Label>
                <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border p-3">
                  {users.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Chưa có nhân sự nào.
                    </p>
                  ) : (
                    users.map((u) => (
                      <label
                        key={u.id}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          name="collaborator_ids"
                          value={u.id}
                          checked={draft.collaborator_ids.includes(u.id)}
                          onChange={(e) =>
                            toggleCollaborator(u.id, e.target.checked)
                          }
                          className="size-4 accent-sky-600"
                        />
                        {u.full_name}
                      </label>
                    ))
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  Có thể chọn nhiều người. Người đã là phụ trách chính sẽ tự bỏ qua.
                </p>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Tạo công việc"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
