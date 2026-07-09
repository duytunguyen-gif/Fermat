"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canManageUsers } from "@/lib/auth/permissions";
import { assignUserSchema } from "@/lib/validations/user.schema";
import { profileSchema, type ProfileInput } from "@/lib/validations/profile.schema";
import type { AccountStatus } from "@/types/database.types";
import { type ActionState, errorState, successState } from "./action-result";
import { zodFieldErrors } from "./zod-errors";

/**
 * Duyệt tài khoản chờ HOẶC cập nhật vai trò/phòng ban của tài khoản đang hoạt động.
 * Luôn đặt account_status = 'active'.
 */
export async function saveUserAssignment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await getCurrentUser();
  if (!actor || !canManageUsers(actor.system_role)) {
    return errorState("Bạn không có quyền quản lý người dùng.");
  }

  const userId = formData.get("user_id")?.toString();
  if (!userId) return errorState("Thiếu thông tin người dùng.");

  const departmentRaw = formData.get("department_id")?.toString();
  const departmentValue =
    !departmentRaw || departmentRaw === "none" ? null : departmentRaw;
  const parsed = assignUserSchema.safeParse({
    system_role: formData.get("system_role"),
    department_id: departmentValue,
  });
  if (!parsed.success) {
    return errorState("Vui lòng kiểm tra lại thông tin.", zodFieldErrors(parsed.error));
  }

  const { system_role, department_id } = parsed.data;

  if (userId === actor.id) {
    return errorState("Không thể tự thay đổi vai trò của chính mình.");
  }

  // Chống leo quyền: chỉ Super Admin được thao tác với/gán vai trò super_admin.
  const supabase = await createClient();
  const { data: target } = await supabase
    .from("users")
    .select("system_role")
    .eq("id", userId)
    .maybeSingle();

  if (!target) return errorState("Không tìm thấy người dùng.");

  if (
    (target.system_role === "super_admin" || system_role === "super_admin") &&
    actor.system_role !== "super_admin"
  ) {
    return errorState("Chỉ Super Admin mới được thao tác với vai trò Super Admin.");
  }

  const { error } = await supabase
    .from("users")
    .update({
      system_role,
      department_id: department_id ?? null,
      account_status: "active",
    })
    .eq("id", userId);

  if (error) return errorState(error.message);

  revalidatePath("/users");
  return successState("Đã cập nhật tài khoản.");
}

/** Khoá / mở khoá tài khoản. */
export async function setUserStatus(
  userId: string,
  status: AccountStatus,
): Promise<ActionState> {
  const actor = await getCurrentUser();
  if (!actor || !canManageUsers(actor.system_role)) {
    return errorState("Bạn không có quyền quản lý người dùng.");
  }
  if (userId === actor.id) {
    return errorState("Không thể tự thay đổi trạng thái của chính mình.");
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("users")
    .select("system_role")
    .eq("id", userId)
    .maybeSingle();

  if (!target) return errorState("Không tìm thấy người dùng.");
  if (target.system_role === "super_admin" && actor.system_role !== "super_admin") {
    return errorState("Chỉ Super Admin mới được thao tác với tài khoản Super Admin.");
  }

  const { error } = await supabase
    .from("users")
    .update({ account_status: status })
    .eq("id", userId);

  if (error) return errorState(error.message);

  revalidatePath("/users");
  return successState(
    status === "suspended" ? "Đã khoá tài khoản." : "Đã mở khoá tài khoản.",
  );
}

/** Trao / thu quyền quản lý chấm công (xem toàn bộ, chỉnh sửa, xuất báo cáo). */
export async function setUserAttendanceManager(
  userId: string,
  value: boolean,
): Promise<ActionState> {
  const actor = await getCurrentUser();
  if (!actor || !canManageUsers(actor.system_role)) {
    return errorState("Bạn không có quyền quản lý người dùng.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ can_manage_attendance: value })
    .eq("id", userId);

  if (error) return errorState(error.message);

  revalidatePath("/users");
  return successState(
    value
      ? "Đã trao quyền quản lý chấm công."
      : "Đã thu quyền quản lý chấm công.",
  );
}

/**
 * Cập nhật HỒ SƠ CÁ NHÂN của chính người đang đăng nhập.
 * Chỉ ghi đúng hàng của mình + các cột hồ sơ được phép (whitelist) — dùng
 * admin client để bỏ qua RLS users_update_admin, nhưng KHÔNG bao giờ đụng
 * tới system_role / account_status / can_manage_attendance.
 */
export async function updateMyProfile(input: ProfileInput): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");
  if (user.account_status !== "active") {
    return errorState("Tài khoản chưa được kích hoạt.");
  }

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return errorState(
      "Vui lòng kiểm tra lại thông tin.",
      zodFieldErrors(parsed.error),
    );
  }
  const d = parsed.data;

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      full_name: d.full_name.trim(),
      real_name: d.real_name || null,
      phone: d.phone || null,
      employee_code: d.employee_code || null,
      job_title: d.job_title || null,
      date_of_birth: d.date_of_birth || null,
      address: d.address || null,
    })
    .eq("id", user.id);

  if (error) return errorState(error.message);

  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
  return successState("Đã lưu hồ sơ cá nhân.");
}
