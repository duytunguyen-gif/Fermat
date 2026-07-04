import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16: "Middleware" đã đổi tên thành "Proxy" (file `proxy.ts`).
 * Chạy trước mỗi request để refresh phiên đăng nhập Supabase và điều hướng cơ bản.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Áp dụng cho mọi đường dẫn TRỪ:
     * - _next/static, _next/image (asset build)
     * - favicon, manifest, icon, file ảnh tĩnh
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
