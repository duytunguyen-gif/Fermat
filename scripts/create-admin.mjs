/**
 * Tạo (hoặc cập nhật) một tài khoản Super Admin đăng nhập bằng email/mật khẩu.
 *
 * Chạy:
 *   node --env-file=.env.local scripts/create-admin.mjs
 *
 * Tuỳ chọn qua biến môi trường:
 *   ADMIN_EMAIL     (mặc định: admin@femattech.local)
 *   ADMIN_PASSWORD  (mặc định: 123456)
 *   ADMIN_NAME      (mặc định: Quản trị hệ thống)
 *
 * Yêu cầu: schema đã được áp dụng (bảng public.users tồn tại) và có
 * NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY trong môi trường.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL || "admin@femattech.local";
const password = process.env.ADMIN_PASSWORD || "123456";
const fullName = process.env.ADMIN_NAME || "Quản trị hệ thống";

if (!url || !serviceKey) {
  console.error("❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findAuthUserByEmail(targetEmail) {
  // Duyệt qua các trang người dùng để tìm theo email.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find(
      (u) => u.email?.toLowerCase() === targetEmail.toLowerCase(),
    );
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}

async function main() {
  console.log(`→ Đang tạo Super Admin: ${email}`);

  let userId;
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createErr) {
    // Có thể tài khoản auth đã tồn tại → tìm lại và đặt lại mật khẩu.
    console.log(`  (auth user có thể đã tồn tại: ${createErr.message}) → tìm lại…`);
    const existing = await findAuthUserByEmail(email);
    if (!existing) throw createErr;
    userId = existing.id;
    await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    console.log("  ✓ Đã cập nhật mật khẩu cho auth user hiện có.");
  } else {
    userId = created.user.id;
    console.log("  ✓ Đã tạo auth user.");
  }

  // Tạo/cập nhật hồ sơ trong public.users với quyền super_admin + active.
  const { error: upsertErr } = await supabase.from("users").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      system_role: "super_admin",
      account_status: "active",
    },
    { onConflict: "id" },
  );
  if (upsertErr) throw upsertErr;

  console.log("  ✓ Đã tạo hồ sơ public.users (super_admin, active).");
  console.log("\n✅ Hoàn tất. Đăng nhập tại http://localhost:3100/login");
  console.log(`   Email: ${email}`);
  console.log(`   Mật khẩu: ${password}`);
}

main().catch((err) => {
  console.error("❌ Lỗi:", err.message || err);
  process.exit(1);
});
