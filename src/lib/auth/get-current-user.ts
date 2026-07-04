import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type DepartmentRow = Database["public"]["Tables"]["departments"]["Row"];

export type CurrentUser = UserRow & {
  department: Pick<DepartmentRow, "id" | "name" | "code"> | null;
};

/**
 * Lấy hồ sơ người dùng hiện tại (kèm phòng ban) từ phiên đăng nhập.
 * Trả về null nếu chưa đăng nhập hoặc chưa có hồ sơ trong bảng `users`.
 *
 * Bọc bằng React `cache` để nhiều Server Component trong cùng một request
 * dùng chung một lần truy vấn.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select(
      "*, department:departments(id, name, code)",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return data as unknown as CurrentUser;
});
