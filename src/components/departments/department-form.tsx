"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { saveDepartment } from "@/lib/actions/departments";
import { IDLE_STATE } from "@/lib/actions/action-result";
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

type Department = Database["public"]["Tables"]["departments"]["Row"];

export function DepartmentForm({
  department,
  trigger,
}: {
  department?: Department;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveDepartment, IDLE_STATE);
  const isEdit = Boolean(department);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
    } else if (state.status === "error" && !state.fieldErrors) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Sửa phòng ban" : "Thêm phòng ban"}
          </DialogTitle>
          <DialogDescription>
            Điền thông tin phòng ban. Mã dùng chữ in hoa, số và dấu gạch dưới.
          </DialogDescription>
        </DialogHeader>

        {/* key để reset các input khi mở lại dialog */}
        <form action={formAction} className="space-y-4" key={open ? "open" : "closed"}>
          {department && <input type="hidden" name="id" value={department.id} />}

          <div className="space-y-2">
            <Label htmlFor="name">Tên phòng ban</Label>
            <Input
              id="name"
              name="name"
              defaultValue={department?.name}
              placeholder="Phòng Ứng dụng AI & Chuyển đổi số"
              required
            />
            {state.fieldErrors?.name && (
              <p className="text-destructive text-sm">{state.fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Mã phòng ban</Label>
            <Input
              id="code"
              name="code"
              defaultValue={department?.code}
              placeholder="AI_CDS"
              className="uppercase"
              required
            />
            {state.fieldErrors?.code && (
              <p className="text-destructive text-sm">{state.fieldErrors.code}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Mô tả (tuỳ chọn)</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={department?.description ?? ""}
              placeholder="Chức năng, nhiệm vụ của phòng ban…"
              rows={3}
            />
            {state.fieldErrors?.description && (
              <p className="text-destructive text-sm">
                {state.fieldErrors.description}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Đang lưu…" : isEdit ? "Lưu thay đổi" : "Tạo phòng ban"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
