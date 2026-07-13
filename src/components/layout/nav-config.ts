import {
  LayoutDashboard,
  ListTodo,
  CalendarClock,
  Bell,
  Building2,
  Users,
  History,
  type LucideIcon,
} from "lucide-react";
import type { SystemRole } from "@/types/database.types";
import { isAdminOrAbove } from "@/lib/auth/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Nếu có, chỉ hiện với các vai trò này. Bỏ trống = mọi vai trò. */
  roles?: SystemRole[];
  /** Hiển thị trong thanh điều hướng dưới cùng trên mobile. */
  mobile?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, mobile: true },
  { href: "/tasks", label: "Công việc", icon: ListTodo, mobile: true },
  { href: "/attendance", label: "Chấm công", icon: CalendarClock, mobile: true },
  { href: "/notifications", label: "Thông báo", icon: Bell, mobile: true },
  {
    href: "/departments",
    label: "Phòng ban",
    icon: Building2,
    roles: ["super_admin", "admin"],
  },
  {
    href: "/users",
    label: "Người dùng",
    icon: Users,
    roles: ["super_admin", "admin"],
  },
  { href: "/activity-logs", label: "Lịch sử", icon: History },
];

/** Lọc mục điều hướng theo vai trò. */
export function navItemsForRole(role: SystemRole): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(role) || isAdminOrAbove(role);
  });
}

/** 4 mục chính hiển thị trên bottom-nav mobile (tối đa 4 để gọn). */
export function mobileNavItemsForRole(role: SystemRole): NavItem[] {
  return navItemsForRole(role)
    .filter((item) => item.mobile)
    .slice(0, 4);
}

/**
 * Các mục còn lại (không nằm trong 4 tab chính) — hiển thị trong bảng "Thêm"
 * của bottom-nav để mobile truy cập đủ mọi mục như sidebar web.
 */
export function mobileOverflowItemsForRole(role: SystemRole): NavItem[] {
  const primary = new Set(mobileNavItemsForRole(role).map((item) => item.href));
  return navItemsForRole(role).filter((item) => !primary.has(item.href));
}
