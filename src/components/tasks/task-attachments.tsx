"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { FileText, Link2, Trash2, Upload, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  addLinkAttachment,
  uploadFileAttachment,
  deleteAttachment,
} from "@/lib/actions/task-activity";
import { IDLE_STATE } from "@/lib/actions/action-result";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AttachmentItem = {
  id: string;
  uploaded_by: string;
  uploader_name: string;
  attachment_type: "file" | "link";
  file_name: string | null;
  href: string | null;
  file_size_bytes: number | null;
  created_at: string;
};

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function TaskAttachments({
  taskId,
  attachments,
  currentUserId,
  canManage,
}: {
  taskId: string;
  attachments: AttachmentItem[];
  currentUserId: string;
  canManage: boolean;
}) {
  const [mode, setMode] = useState<"file" | "link">("file");
  const [linkState, linkAction, linkPending] = useActionState(addLinkAttachment, IDLE_STATE);
  const [fileState, fileAction, filePending] = useActionState(uploadFileAttachment, IDLE_STATE);
  const linkRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (linkState.status === "success") {
      toast.success(linkState.message);
      linkRef.current?.reset();
    } else if (linkState.status === "error" && !linkState.fieldErrors) {
      toast.error(linkState.message);
    }
  }, [linkState]);

  useEffect(() => {
    if (fileState.status === "success") {
      toast.success(fileState.message);
      fileRef.current?.reset();
    } else if (fileState.status === "error") {
      toast.error(fileState.message);
    }
  }, [fileState]);

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteAttachment(id, taskId);
      if (res.status === "error") toast.error(res.message);
      else toast.success(res.message);
    });
  }

  return (
    <div className="space-y-4">
      {/* Bộ chọn kiểu đính kèm */}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "file" ? "default" : "outline"}
          onClick={() => setMode("file")}
        >
          <Upload className="size-4" /> Tải tệp
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "link" ? "default" : "outline"}
          onClick={() => setMode("link")}
        >
          <Link2 className="size-4" /> Dán đường dẫn
        </Button>
      </div>

      {mode === "file" ? (
        <form ref={fileRef} action={fileAction} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-end">
          <input type="hidden" name="task_id" value={taskId} />
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="att-file">Chọn tệp (tối đa 20MB)</Label>
            <Input id="att-file" name="file" type="file" required className="cursor-pointer" />
          </div>
          <Button type="submit" disabled={filePending}>
            {filePending ? "Đang tải…" : "Tải lên"}
          </Button>
        </form>
      ) : (
        <form ref={linkRef} action={linkAction} className="space-y-2 rounded-lg border p-3">
          <input type="hidden" name="task_id" value={taskId} />
          <div className="space-y-1.5">
            <Label htmlFor="att-url">Đường dẫn</Label>
            <Input id="att-url" name="url" placeholder="https://drive.google.com/..." required />
            {linkState.fieldErrors?.url && (
              <p className="text-destructive text-sm">{linkState.fieldErrors.url}</p>
            )}
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="att-name">Tên hiển thị (tuỳ chọn)</Label>
              <Input id="att-name" name="file_name" placeholder="VD: Đề cương ôn tập" />
            </div>
            <Button type="submit" disabled={linkPending}>
              {linkPending ? "Đang thêm…" : "Thêm"}
            </Button>
          </div>
        </form>
      )}

      {attachments.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có tệp đính kèm nào.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
              <a
                href={a.href ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 flex-1 items-center gap-2.5 hover:underline"
              >
                {a.attachment_type === "file" ? (
                  <FileText className="size-4 shrink-0 text-sky-600" />
                ) : (
                  <Link2 className="size-4 shrink-0 text-violet-600" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {a.file_name ?? a.href}
                </span>
                {a.attachment_type === "file" && a.file_size_bytes && (
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {fmtSize(a.file_size_bytes)}
                  </span>
                )}
                <ExternalLink className="text-muted-foreground size-3.5 shrink-0" />
              </a>
              {(canManage || a.uploaded_by === currentUserId) && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => remove(a.id)}
                  title="Xoá đính kèm"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
