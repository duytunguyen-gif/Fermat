import type { TaskStatus } from "@/types/database.types";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: "Chưa làm",
  in_progress: "Đang xử lý",
  waiting_customer: "Chờ khách hàng phản hồi",
  pending_approval: "Chờ duyệt",
  needs_revision: "Cần chỉnh sửa",
  completed: "Hoàn thành",
  cancelled: "Huỷ",
};

/** Màu badge theo trạng thái (Tailwind classes, dùng cho light mode). */
export const TASK_STATUS_BADGE: Record<TaskStatus, string> = {
  not_started: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  waiting_customer: "bg-amber-100 text-amber-800 border-amber-200",
  pending_approval: "bg-violet-100 text-violet-700 border-violet-200",
  needs_revision: "bg-orange-100 text-orange-700 border-orange-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
};

/** Màu nền cho biểu đồ (hex) — trùng ý nghĩa với badge ở trên. */
export const TASK_STATUS_CHART_COLOR: Record<TaskStatus, string> = {
  not_started: "#64748b",
  in_progress: "#3b82f6",
  waiting_customer: "#f59e0b",
  pending_approval: "#8b5cf6",
  needs_revision: "#f97316",
  completed: "#10b981",
  cancelled: "#f43f5e",
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  "not_started",
  "in_progress",
  "waiting_customer",
  "pending_approval",
  "needs_revision",
  "completed",
  "cancelled",
];

/**
 * Ma trận chuyển trạng thái hợp lệ (khớp với trigger validate_task_status_transition ở DB).
 * Từ trạng thái key → tập trạng thái được phép chuyển đến.
 */
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  not_started: ["in_progress", "cancelled"],
  in_progress: ["waiting_customer", "pending_approval", "cancelled"],
  waiting_customer: ["in_progress", "cancelled"],
  pending_approval: ["completed", "needs_revision", "cancelled"],
  needs_revision: ["in_progress", "cancelled"],
  completed: [], // đã hoàn thành thì khoá, không đổi tiếp
  cancelled: [], // đã huỷ thì khoá
};

/** Các trạng thái được coi là "đang mở" (chưa đóng việc). */
export const OPEN_STATUSES: TaskStatus[] = [
  "not_started",
  "in_progress",
  "waiting_customer",
  "pending_approval",
  "needs_revision",
];

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
