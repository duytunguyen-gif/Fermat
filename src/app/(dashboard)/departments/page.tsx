import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canManageDepartments } from "@/lib/auth/permissions";
import {
  DepartmentTable,
  type DepartmentWithCount,
} from "@/components/departments/department-table";

export const metadata: Metadata = { title: "Phòng ban" };

export default async function DepartmentsPage() {
  const user = await getCurrentUser();
  if (!user || !canManageDepartments(user.system_role)) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data: departments }, { data: members }] = await Promise.all([
    supabase.from("departments").select("*").order("created_at"),
    supabase.from("users").select("department_id"),
  ]);

  const counts = new Map<string, number>();
  for (const m of members ?? []) {
    if (m.department_id) {
      counts.set(m.department_id, (counts.get(m.department_id) ?? 0) + 1);
    }
  }

  const rows: DepartmentWithCount[] = (departments ?? []).map((d) => ({
    ...d,
    memberCount: counts.get(d.id) ?? 0,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">Phòng ban</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Quản lý danh sách phòng ban của công ty.
      </p>
      <div className="mt-6">
        <DepartmentTable departments={rows} />
      </div>
    </div>
  );
}
