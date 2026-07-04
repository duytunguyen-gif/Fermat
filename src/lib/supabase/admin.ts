import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Supabase client dùng khoá SERVICE ROLE — BỎ QUA RLS.
 * CHỈ được import và gọi phía server (Server Actions / Route Handlers).
 * Dùng cho các thao tác đặc quyền: duyệt/tạo tài khoản, gán role, seed dữ liệu.
 *
 * Không bao giờ import file này vào Client Component.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "Thiếu SUPABASE_SERVICE_ROLE_KEY — không thể tạo admin client.",
    );
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
