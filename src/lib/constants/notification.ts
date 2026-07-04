import {
  UserPlus,
  RefreshCcw,
  ClipboardCheck,
  CheckCircle2,
  PencilLine,
  Clock,
  AlertTriangle,
  MessageSquare,
  AtSign,
  Bell,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "@/types/database.types";

/** Biểu tượng + màu sắc + nhãn cho từng loại thông báo. */
export const NOTIFICATION_META: Record<
  NotificationType,
  { label: string; icon: LucideIcon; tone: string }
> = {
  task_assigned: {
    label: "Giao việc",
    icon: UserPlus,
    tone: "bg-blue-100 text-blue-700",
  },
  status_changed: {
    label: "Đổi trạng thái",
    icon: RefreshCcw,
    tone: "bg-slate-100 text-slate-700",
  },
  approval_requested: {
    label: "Chờ duyệt",
    icon: ClipboardCheck,
    tone: "bg-violet-100 text-violet-700",
  },
  approved: {
    label: "Đã duyệt",
    icon: CheckCircle2,
    tone: "bg-emerald-100 text-emerald-700",
  },
  revision_requested: {
    label: "Cần chỉnh sửa",
    icon: PencilLine,
    tone: "bg-orange-100 text-orange-700",
  },
  due_soon: {
    label: "Sắp đến hạn",
    icon: Clock,
    tone: "bg-amber-100 text-amber-800",
  },
  overdue: {
    label: "Quá hạn",
    icon: AlertTriangle,
    tone: "bg-rose-100 text-rose-700",
  },
  comment_added: {
    label: "Bình luận",
    icon: MessageSquare,
    tone: "bg-sky-100 text-sky-700",
  },
  mentioned: {
    label: "Nhắc đến bạn",
    icon: AtSign,
    tone: "bg-indigo-100 text-indigo-700",
  },
};

/** Meta an toàn cho loại lạ (phòng khi DB thêm enum mới). */
export function notificationMeta(type: NotificationType) {
  return (
    NOTIFICATION_META[type] ?? {
      label: "Thông báo",
      icon: Bell,
      tone: "bg-slate-100 text-slate-700",
    }
  );
}

/** Đường dẫn khi bấm vào thông báo (về công việc liên quan nếu có). */
export function notificationHref(taskId: string | null): string {
  return taskId ? `/tasks/${taskId}` : "/notifications";
}
