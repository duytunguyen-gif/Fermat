"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { saveUserAssignment } from "@/lib/actions/users";
import { IDLE_STATE } from "@/lib/actions/action-result";
import { ROLE_ORDER, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/constants/roles";
import type { SystemRole } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

export type AssignTargetUser = {
  id: string;
  full_name: string;
  email: string;
  system_role: SystemRole;
  department_id: string | null;
};

export function UserAssignDialog({
  user,
  departments,
  canGrantSuperAdmin,
  mode,
  trigger,
}: {
  user: AssignTargetUser;
  departments: { id: string; name: string }[];
  canGrantSuperAdmin: boolean;
  mode: "approve" | "edit";
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    saveUserAssignment,
    IDLE_STATE,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
    } else if (state.status === "error" && !state.fieldErrors) {
      toast.error(state.message);
    }
  }, [state]);

  const roleOptions = ROLE_ORDER.filter(
    (r) => canGrantSuperAdmin || r !== "super_admin",
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "approve" ? "Duyệt tài khoản" : "Cập nhật tài khoản"}
          </DialogTitle>
          <DialogDescription>
            {user.full_name} · {user.email}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4" key={open ? "open" : "closed"}>
          <input type="hidden" name="user_id" value={user.id} />

          <div className="space-y-2">
            <Label htmlFor="system_role">Vai trò</Label>
            <Select name="system_role" defaultValue={user.system_role}>
              <SelectTrigger id="system_role" className="w-full">
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department_id">Phòng ban</Label>
            <Select
              name="department_id"
              defaultValue={user.department_id ?? "none"}
            >
              <SelectTrigger id="department_id" className="w-full">
                <SelectValue placeholder="Chọn phòng ban" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Chưa phân phòng —</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Đang lưu…"
                : mode === "approve"
                  ? "Duyệt & kích hoạt"
                  : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
