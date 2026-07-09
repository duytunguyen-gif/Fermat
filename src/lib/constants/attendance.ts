/**
 * Hằng số & tiện ích cho module Chấm công.
 * Giờ giấc luôn quy về múi giờ Việt Nam để hiển thị nhất quán,
 * bất kể máy chủ/trình duyệt đặt ở múi giờ nào.
 */

export const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

/**
 * Giờ vào chuẩn (giờ hành chính) — chỉ dùng để HIỂN THỊ nhãn ở giao diện.
 * Logic đánh dấu "đi trễ" nằm ở trigger DB (attendance_compute); nếu đổi giờ
 * chuẩn phải sửa cả hai chỗ: hằng số này và biến v_start trong migration.
 */
export const STANDARD_START_LABEL = "08:00";

/** Ngày làm việc hôm nay theo múi giờ VN, dạng yyyy-mm-dd. */
export function todayWorkDate(): string {
  // en-CA cho định dạng yyyy-mm-dd.
  return new Intl.DateTimeFormat("en-CA", { timeZone: VN_TIMEZONE }).format(
    new Date(),
  );
}

/** Định dạng giờ:phút (VD "08:05") theo múi giờ VN từ một timestamptz. */
export function formatVnTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** Giá trị "HH:mm" (giờ VN) cho ô <input type="time">, hoặc "" nếu trống. */
export function vnTimeValue(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: VN_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** Định dạng ngày (VD "Th 4, 09/07/2026") theo múi giờ VN từ yyyy-mm-dd. */
export function formatVnDate(dateStr: string): string {
  // Ghép giờ trưa để tránh lệch ngày do múi giờ khi parse.
  const d = new Date(`${dateStr}T12:00:00+07:00`);
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TIMEZONE,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Số giờ làm dạng "8h30" (hoặc "—" nếu chưa đủ giờ vào/ra). */
export function formatWorkHours(hours: number | null): string {
  if (hours == null) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}
