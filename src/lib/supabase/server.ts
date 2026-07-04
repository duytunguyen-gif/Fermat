import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

/**
 * Supabase client dùng trong Server Components, Server Actions và Route Handlers.
 * Next.js 16: `cookies()` là async nên hàm này phải được await.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Được gọi từ Server Component (chỉ đọc cookie) — bỏ qua an toàn,
            // việc refresh session đã do proxy.ts đảm nhiệm.
          }
        },
      },
    },
  );
}
