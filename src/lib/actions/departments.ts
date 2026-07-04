"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canManageDepartments } from "@/lib/auth/permissions";
import { departmentSchema } from "@/lib/validations/department.schema";
import {
  type ActionState,
  errorState,
  successState,
} from "./action-result";
import { zodFieldErrors } from "./zod-errors";

/** Tạo mới hoặc cập nhật phòng ban (phân biệt qua trường ẩn `id`). */
export async function saveDepartment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canManageDepartments(user.system_role)) {
    return errorState("Bạn không có quyền quản lý phòng ban.");
  }

  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return errorState("Vui lòng kiểm tra lại thông tin.", zodFieldErrors(parsed.error));
  }

  const id = formData.get("id")?.toString() || null;
  const supabase = await createClient();
  const payload = {
    name: parsed.data.name,
    code: parsed.data.code,
    description: parsed.data.description || null,
  };

  const { error } = id
    ? await supabase.from("departments").update(payload).eq("id", id)
    : await supabase.from("departments").insert(payload);

  if (error) {
    if (error.code === "23505") {
      return errorState("Tên hoặc mã phòng ban đã tồn tại.");
    }
    return errorState(error.message);
  }

  revalidatePath("/departments");
  return successState(id ? "Đã cập nhật phòng ban." : "Đã tạo phòng ban.");
}

/** Bật/tắt trạng thái hoạt động của phòng ban. */
export async function setDepartmentActive(
  id: string,
  isActive: boolean,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !canManageDepartments(user.system_role)) {
    return errorState("Bạn không có quyền quản lý phòng ban.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return errorState(error.message);

  revalidatePath("/departments");
  return successState(isActive ? "Đã bật phòng ban." : "Đã tắt phòng ban.");
}
