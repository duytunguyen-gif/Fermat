import type { TaskPriority, TaskType } from "@/types/database.types";

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Thấp",
  normal: "Bình thường",
  high: "Cao",
  urgent: "Khẩn cấp",
};

export const TASK_PRIORITY_BADGE: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-600 border-slate-200",
  normal: "bg-sky-100 text-sky-700 border-sky-200",
  high: "bg-amber-100 text-amber-800 border-amber-200",
  urgent: "bg-red-100 text-red-700 border-red-200",
};

export const TASK_PRIORITY_ORDER: TaskPriority[] = [
  "low",
  "normal",
  "high",
  "urgent",
];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  project: "Dự án",
  routine: "Thường ngày",
  periodic: "Định kỳ",
  ad_hoc: "Phát sinh",
};

export const TASK_TYPE_ORDER: TaskType[] = [
  "project",
  "routine",
  "periodic",
  "ad_hoc",
];
