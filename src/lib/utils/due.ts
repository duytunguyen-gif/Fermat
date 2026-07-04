import type { TaskStatus } from "@/types/database.types";

export type DueState = "none" | "overdue" | "due_soon" | "ok";

/** Ngày hôm nay theo dạng YYYY-MM-DD (giờ địa phương). */
function todayISO(): string {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - tzOffset).toISOString().slice(0, 10);
}

/**
 * Trạng thái hạn chót của một công việc.
 * - overdue : đã qua hạn (và việc còn mở)
 * - due_soon: đến hạn trong 2 ngày tới
 * - ok      : còn hạn
 * - none    : không có hạn / việc đã đóng
 */
export function dueState(
  dueDate: string | null,
  status: TaskStatus,
): DueState {
  if (!dueDate) return "none";
  if (status === "completed" || status === "cancelled") return "none";

  const today = todayISO();
  if (dueDate < today) return "overdue";

  const soon = new Date();
  soon.setDate(soon.getDate() + 2);
  const soonISO = new Date(soon.getTime() - soon.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
  if (dueDate <= soonISO) return "due_soon";

  return "ok";
}

export const DUE_BADGE: Record<
  Exclude<DueState, "none" | "ok">,
  { label: string; className: string }
> = {
  overdue: {
    label: "Quá hạn",
    className: "bg-rose-100 text-rose-700 border-rose-200",
  },
  due_soon: {
    label: "Sắp đến hạn",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
};
