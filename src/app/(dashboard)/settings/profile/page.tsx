import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ROLE_LABELS } from "@/lib/constants/roles";
import {
  ProfileForm,
  type ProfileInitial,
} from "@/components/profile/profile-form";
import { PasswordChangeCard } from "@/components/profile/password-change-card";

export const metadata: Metadata = { title: "Hồ sơ cá nhân" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const initial: ProfileInitial = {
    full_name: user.full_name ?? "",
    real_name: user.real_name ?? "",
    email: user.email,
    phone: user.phone ?? "",
    employee_code: user.employee_code ?? "",
    job_title: user.job_title ?? "",
    date_of_birth: user.date_of_birth ?? "",
    address: user.address ?? "",
    role_label: ROLE_LABELS[user.system_role],
    department_name: user.department?.name ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hồ sơ cá nhân</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Xem và cập nhật thông tin cá nhân, đổi mật khẩu đăng nhập.
        </p>
      </div>

      <ProfileForm initial={initial} />
      <PasswordChangeCard />
    </div>
  );
}
