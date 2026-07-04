import type { SystemRole, AccountStatus } from "@/types/database.types";

/** Nhãn tiếng Việt cho vai trò hệ thống. */
export const ROLE_LABELS: Record<SystemRole, string> = {
  super_admin: "Super Admin",
  executive: "Ban Lãnh Đạo",
  admin: "Admin",
  manager: "Trưởng phòng/nhóm",
  staff: "Nhân viên",
};

/** Mô tả ngắn quyền hạn của từng vai trò. */
export const ROLE_DESCRIPTIONS: Record<SystemRole, string> = {
  super_admin: "Toàn quyền hệ thống.",
  executive: "Được giao việc, duyệt việc, xem toàn bộ dữ liệu.",
  admin: "Quản lý tài khoản, phòng ban, phân quyền và dữ liệu.",
  manager: "Được giao việc, duyệt việc, xem toàn công ty.",
  staff: "Tự tạo việc cho mình, cập nhật tiến độ, gửi duyệt.",
};

/** Thứ hạng quyền (cao hơn = nhiều quyền hơn). */
export const ROLE_RANK: Record<SystemRole, number> = {
  super_admin: 100,
  admin: 80,
  executive: 60,
  manager: 40,
  staff: 20,
};

export const ROLE_ORDER: SystemRole[] = [
  "super_admin",
  "executive",
  "admin",
  "manager",
  "staff",
];

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  pending: "Chờ duyệt",
  active: "Đang hoạt động",
  suspended: "Đã khoá",
};
