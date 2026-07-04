"use client";

import { useState, useTransition } from "react";
import { Crown, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { addAssignee, removeAssignee } from "@/lib/actions/tasks";
import type { TaskParticipationRole } from "@/types/database.types";
import type { UserOption } from "./task-form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AssigneeItem = {
  id: string;
  user_id: string;
  full_name: string;
  participation_role: TaskParticipationRole;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();
}

export function TaskAssignees({
  taskId,
  assignees,
  users,
  canManage,
}: {
  taskId: string;
  assignees: AssigneeItem[];
  users: UserOption[];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState<TaskParticipationRole>("collaborator");

  const assignedIds = new Set(assignees.map((a) => a.user_id));
  const available = users.filter((u) => !assignedIds.has(u.id));

  function act(fn: () => Promise<{ status: string; message?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.status === "error") toast.error(res.message);
      else toast.success(res.message);
    });
  }

  return (
    <div className="space-y-4">
      {assignees.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa giao cho ai.</p>
      ) : (
        <ul className="space-y-2">
          {assignees.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-2.5"
            >
              <div className="flex items-center gap-2.5">
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">
                    {initials(a.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{a.full_name}</p>
                  {a.participation_role === "lead" ? (
                    <Badge className="border-amber-200 bg-amber-100 text-amber-800">
                      <Crown className="size-3" /> Phụ trách chính
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      Người phối hợp
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  {a.participation_role !== "lead" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => act(() => addAssignee(taskId, a.user_id, "lead"))}
                      title="Đặt làm phụ trách chính"
                    >
                      <Crown className="size-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => act(() => removeAssignee(a.id, taskId))}
                    title="Gỡ khỏi công việc"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && available.length > 0 && (
        <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row">
          <Select value={addUserId} onValueChange={setAddUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Chọn người để thêm…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={addRole}
            onValueChange={(v) => setAddRole(v as TaskParticipationRole)}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="collaborator">Người phối hợp</SelectItem>
              <SelectItem value="lead">Phụ trách chính</SelectItem>
            </SelectContent>
          </Select>
          <Button
            disabled={pending || !addUserId}
            onClick={() =>
              act(async () => {
                const res = await addAssignee(taskId, addUserId, addRole);
                if (res.status !== "error") {
                  setAddUserId("");
                  setAddRole("collaborator");
                }
                return res;
              })
            }
          >
            <UserPlus className="size-4" />
            Thêm
          </Button>
        </div>
      )}
    </div>
  );
}
