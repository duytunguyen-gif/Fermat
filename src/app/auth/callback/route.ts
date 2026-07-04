import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Google OAuth callback.
 * 1) Đổi `code` lấy session.
 * 2) Cấp phát hồ sơ trong bảng `users` nếu chưa có:
 *    - Người đầu tiên (hoặc email == SUPER_ADMIN_EMAIL) → super_admin + active.
 *    - Còn lại → staff + pending (chờ Admin duyệt).
 * 3) Điều hướng theo trạng thái tài khoản.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const admin = createAdminClient();

  // Hồ sơ đã tồn tại?
  const { data: existing } = await admin
    .from("users")
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle();

  let accountStatus = existing?.account_status ?? null;

  if (!accountStatus) {
    // Chưa có hồ sơ → cấp phát mới.
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim();
    const { count } = await admin
      .from("users")
      .select("*", { count: "exact", head: true });

    const isBootstrap =
      (superAdminEmail && user.email?.toLowerCase() === superAdminEmail) ||
      (count ?? 0) === 0;

    const meta = user.user_metadata ?? {};
    const fullName =
      meta.full_name || meta.name || user.email?.split("@")[0] || "Người dùng";

    const { error: insertError } = await admin.from("users").insert({
      id: user.id,
      email: user.email!,
      full_name: fullName,
      avatar_url: meta.avatar_url || meta.picture || null,
      system_role: isBootstrap ? "super_admin" : "staff",
      account_status: isBootstrap ? "active" : "pending",
    });

    if (insertError) {
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }
    accountStatus = isBootstrap ? "active" : "pending";
  }

  if (accountStatus === "suspended") {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=suspended`);
  }

  if (accountStatus === "pending") {
    return NextResponse.redirect(`${origin}/pending`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
