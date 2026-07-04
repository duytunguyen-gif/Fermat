"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  addComment,
  updateComment,
  deleteComment,
} from "@/lib/actions/task-activity";
import { IDLE_STATE } from "@/lib/actions/action-result";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type CommentItem = {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  edited: boolean;
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase();
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function TaskComments({
  taskId,
  comments,
  currentUserId,
  isAdmin,
}: {
  taskId: string;
  comments: CommentItem[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState(addComment, IDLE_STATE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      formRef.current?.reset();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <div className="space-y-4">
      <form ref={formRef} action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="task_id" value={taskId} />
        <Textarea name="content" rows={2} placeholder="Viết bình luận…" required />
        <Button type="submit" size="sm" disabled={pending} className="self-end">
          {pending ? "Đang gửi…" : "Bình luận"}
        </Button>
      </form>

      {comments.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có bình luận nào.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              taskId={taskId}
              canModify={c.user_id === currentUserId}
              canDelete={c.user_id === currentUserId || isAdmin}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  taskId,
  canModify,
  canDelete,
}: {
  comment: CommentItem;
  taskId: string;
  canModify: boolean;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await updateComment(comment.id, taskId, draft);
      if (res.status === "error") toast.error(res.message);
      else {
        toast.success(res.message);
        setEditing(false);
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteComment(comment.id, taskId);
      if (res.status === "error") toast.error(res.message);
      else toast.success(res.message);
    });
  }

  return (
    <li className="flex gap-3">
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="text-xs">{initials(comment.user_name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{comment.user_name}</span>
          <span className="text-muted-foreground text-xs">{fmtDateTime(comment.created_at)}</span>
          {comment.edited && <span className="text-muted-foreground text-xs">(đã sửa)</span>}
        </div>

        {editing ? (
          <div className="space-y-2">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={pending}>
                <Check className="size-4" /> Lưu
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDraft(comment.content);
                  setEditing(false);
                }}
              >
                <X className="size-4" /> Huỷ
              </Button>
            </div>
          </div>
        ) : (
          <div className="group flex items-start justify-between gap-2">
            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
            {(canModify || canDelete) && (
              <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {canModify && (
                  <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                    <Pencil className="size-3.5" />
                  </Button>
                )}
                {canDelete && (
                  <Button size="sm" variant="ghost" onClick={remove} disabled={pending}>
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
