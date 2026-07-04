import {
  FilePlus2,
  Pencil,
  RefreshCcw,
  Trash2,
  UserPlus,
  UserMinus,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  PencilLine,
  Activity,
  type LucideIcon,
} from "lucide-react";
import type { ActivityAction } from "@/types/database.types";

/** Biểu tượng + màu nền cho từng loại thao tác. */
export const ACTIVITY_META: Record<
  ActivityAction,
  { icon: LucideIcon; tone: string }
> = {
  created: { icon: FilePlus2, tone: "bg-emerald-100 text-emerald-700" },
  updated: { icon: Pencil, tone: "bg-slate-100 text-slate-700" },
  deleted: { icon: Trash2, tone: "bg-rose-100 text-rose-700" },
  status_changed: { icon: RefreshCcw, tone: "bg-blue-100 text-blue-700" },
  assignee_added: { icon: UserPlus, tone: "bg-indigo-100 text-indigo-700" },
  assignee_removed: { icon: UserMinus, tone: "bg-amber-100 text-amber-800" },
  commented: { icon: MessageSquare, tone: "bg-sky-100 text-sky-700" },
  attachment_added: { icon: Paperclip, tone: "bg-teal-100 text-teal-700" },
  attachment_removed: { icon: Paperclip, tone: "bg-amber-100 text-amber-800" },
  approved: { icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-700" },
  revision_requested: { icon: PencilLine, tone: "bg-orange-100 text-orange-700" },
};

/** Meta an toàn cho action lạ (phòng khi DB thêm enum mới). */
export function activityMeta(action: ActivityAction) {
  return (
    ACTIVITY_META[action] ?? {
      icon: Activity,
      tone: "bg-slate-100 text-slate-700",
    }
  );
}

/** Danh từ tiếng Việt cho từng loại đối tượng (tên bảng). */
const ENTITY_NOUN: Record<string, string> = {
  tasks: "công việc",
  task_assignees: "người tham gia",
  task_comments: "bình luận",
  task_attachments: "tệp đính kèm",
};

/** Nhãn ngắn gọn mô tả thao tác, ghép theo đối tượng khi cần. */
export function activityLabel(entityType: string, action: ActivityAction): string {
  const noun = ENTITY_NOUN[entityType] ?? "mục";
  switch (action) {
    case "created":
      return `Tạo ${noun}`;
    case "updated":
      return `Cập nhật ${noun}`;
    case "deleted":
      return `Xoá ${noun}`;
    case "status_changed":
      return "Đổi trạng thái";
    case "assignee_added":
      return "Thêm người tham gia";
    case "assignee_removed":
      return "Gỡ người tham gia";
    case "commented":
      return "Bình luận mới";
    case "attachment_added":
      return "Đính kèm tệp";
    case "attachment_removed":
      return "Gỡ tệp đính kèm";
    case "approved":
      return "Duyệt hoàn thành";
    case "revision_requested":
      return "Yêu cầu chỉnh sửa";
    default:
      return "Thao tác";
  }
}

/** Nhóm lọc theo đối tượng (dùng cho bộ lọc trên UI). */
export const ACTIVITY_ENTITY_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "Tất cả đối tượng" },
  { value: "tasks", label: "Công việc" },
  { value: "task_assignees", label: "Người tham gia" },
  { value: "task_comments", label: "Bình luận" },
  { value: "task_attachments", label: "Tệp đính kèm" },
];
