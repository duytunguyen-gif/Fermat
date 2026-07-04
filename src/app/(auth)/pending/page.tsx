import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Chờ duyệt tài khoản" };

export default async function PendingPage() {
  const user = await getCurrentUser();

  // Chưa đăng nhập → proxy đã chặn, nhưng phòng hờ.
  if (!user) redirect("/login");
  // Đã được duyệt → vào thẳng ứng dụng.
  if (user.account_status === "active") redirect("/dashboard");
  if (user.account_status === "suspended") redirect("/login?error=suspended");

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
        <Clock className="size-8" />
      </div>
      <h1 className="text-xl font-semibold text-white">
        Tài khoản đang chờ duyệt
      </h1>
      <p className="mt-3 text-sm text-slate-400">
        Chào <span className="font-medium text-slate-200">{user.full_name}</span>,
        tài khoản của bạn đã được tạo và đang chờ quản trị viên duyệt cùng phân
        công phòng ban. Bạn sẽ truy cập được hệ thống ngay sau khi được duyệt.
      </p>

      <form action={signOut} className="mt-8 w-full">
        <Button
          type="submit"
          variant="outline"
          className="w-full border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
        >
          Đăng xuất
        </Button>
      </form>
    </div>
  );
}
