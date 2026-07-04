import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { ROLE_LABELS } from "@/lib/constants/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Cổng kiểm soát: chỉ tài khoản active mới vào được khu vực ứng dụng.
  if (!user) redirect("/login");
  if (user.account_status === "pending") redirect("/pending");
  if (user.account_status === "suspended") redirect("/login?error=suspended");

  // Số thông báo chưa đọc để hiển thị trên chuông (RLS chỉ đếm của chính mình).
  const supabase = await createClient();
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  return (
    <div className="flex min-h-dvh">
      <Sidebar role={user.system_role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={{
            name: user.full_name,
            email: user.email,
            avatarUrl: user.avatar_url,
            roleLabel: ROLE_LABELS[user.system_role],
            departmentName: user.department?.name ?? null,
          }}
          unreadCount={unreadCount ?? 0}
        />
        <main className="flex-1 px-4 pt-6 pb-24 md:px-8 md:pt-8 md:pb-10">{children}</main>
        <BottomNav role={user.system_role} />
      </div>
    </div>
  );
}
