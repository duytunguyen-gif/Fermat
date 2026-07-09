import type { SystemRole } from "@/types/database.types";
import { ROLE_RANK } from "@/lib/constants/roles";

/**
 * Logic phân quyền tập trung — dùng chung cho UI và Server Actions.
 * Phải phản chiếu đúng các policy RLS ở DB (defense-in-depth), không thay thế chúng.
 */

/** Admin trở lên (quản lý tài khoản, phòng ban, phân quyền). */
export function isAdminOrAbove(role: SystemRole): boolean {
  return role === "admin" || role === "super_admin";
}

/** Được tạo tài khoản, duyệt tài khoản chờ và gán vai trò/phòng ban. */
export function canManageUsers(role: SystemRole): boolean {
  return isAdminOrAbove(role);
}

/** Được tạo/sửa/xoá phòng ban. */
export function canManageDepartments(role: SystemRole): boolean {
  return isAdminOrAbove(role);
}

/** Được giao việc cho người khác. */
export function canAssignTask(role: SystemRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "executive" ||
    role === "manager"
  );
}

/**
 * Được duyệt/từ chối hoàn thành việc ở cấp vai trò.
 * Lưu ý: người duyệt thực tế của MỘT task là `approver_id`; hàm này chỉ kiểm
 * xem vai trò có thuộc nhóm được phép làm người duyệt hay không.
 */
export function canApprove(role: SystemRole): boolean {
  return (
    role === "super_admin" ||
    role === "admin" ||
    role === "executive" ||
    role === "manager"
  );
}

/**
 * Được quản lý chấm công toàn công ty (xem tất cả, chỉnh sửa, xuất báo cáo).
 * Admin trở lên luôn có; hoặc nhân viên được admin trao cờ can_manage_attendance.
 * Phản chiếu hàm has_attendance_access() ở DB.
 */
export function canManageAttendance(
  role: SystemRole,
  canManageAttendanceFlag: boolean,
): boolean {
  return isAdminOrAbove(role) || canManageAttendanceFlag;
}

/** So sánh thứ hạng — role A có quyền ngang hoặc cao hơn role B. */
export function hasRankAtLeast(role: SystemRole, min: SystemRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
