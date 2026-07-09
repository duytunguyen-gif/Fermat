import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canManageUsers } from "@/lib/auth/permissions";
import {
  UsersManager,
  type UserListItem,
} from "@/components/users/users-manager";

export const metadata: Metadata = { title: "Người dùng" };

export default async function UsersPage() {
  const actor = await getCurrentUser();
  if (!actor || !canManageUsers(actor.system_role)) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: users }, { data: departments }] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id, full_name, email, avatar_url, system_role, account_status, department_id, can_manage_attendance, department:departments(name)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("departments")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
  ]);

  const list: UserListItem[] = (users ?? []).map((u) => {
    const dept = u.department as unknown as
      | { name: string }
      | { name: string }[]
      | null;
    const departmentName = Array.isArray(dept)
      ? (dept[0]?.name ?? null)
      : (dept?.name ?? null);
    return {
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      avatar_url: u.avatar_url,
      system_role: u.system_role,
      account_status: u.account_status,
      department_id: u.department_id,
      department_name: departmentName,
      can_manage_attendance: u.can_manage_attendance ?? false,
    };
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">Người dùng</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Duyệt tài khoản chờ, gán vai trò và phòng ban.
      </p>
      <div className="mt-6">
        <UsersManager
          users={list}
          departments={departments ?? []}
          actorRole={actor.system_role}
        />
      </div>
    </div>
  );
}
