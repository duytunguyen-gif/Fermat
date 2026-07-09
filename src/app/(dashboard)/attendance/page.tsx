import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canApprove, canManageAttendance } from "@/lib/auth/permissions";
import {
  todayWorkDate,
  formatVnTime,
  formatWorkHours,
} from "@/lib/constants/attendance";
import {
  CheckInOutCard,
  type TodayAttendance,
} from "@/components/attendance/check-in-out-card";
import {
  AttendanceMonthTable,
  type AttendanceRow,
} from "@/components/attendance/attendance-month-table";
import {
  AttendanceAdminPanel,
  type AdminAttendanceRow,
  type AttendanceUserOption,
} from "@/components/attendance/attendance-admin-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Chấm công" };

/** "yyyy-mm" của tháng hiện tại theo múi giờ VN. */
function currentMonth(): string {
  return todayWorkDate().slice(0, 7);
}

/** Kiểm tra chuỗi "yyyy-mm" hợp lệ. */
function normalizeMonth(raw: string | undefined): string {
  return raw && /^\d{4}-\d{2}$/.test(raw) ? raw : currentMonth();
}

type TeamTodayRow = {
  id: string;
  check_in_at: string | null;
  check_out_at: string | null;
  work_hours: number | null;
  is_late: boolean;
  user: { full_name: string } | null;
};

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { month: monthParam } = await searchParams;
  const month = normalizeMonth(monthParam);
  const monthStart = `${month}-01`;
  // Ngày đầu tháng kế tiếp (chặn trên, không bao gồm).
  const [y, m] = month.split("-").map(Number);
  const nextMonth = `${new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7)}-01`;

  const supabase = await createClient();
  const workDate = todayWorkDate();

  // Chấm công hôm nay (cho thẻ vào/ra).
  const { data: todayRow } = await supabase
    .from("attendance")
    .select("check_in_at, check_out_at, work_hours, is_late")
    .eq("user_id", user.id)
    .eq("work_date", workDate)
    .maybeSingle();

  // Bảng chấm công của mình trong tháng đang chọn.
  const { data: monthRowsRaw } = await supabase
    .from("attendance")
    .select("id, work_date, check_in_at, check_out_at, work_hours, is_late, note")
    .eq("user_id", user.id)
    .gte("work_date", monthStart)
    .lt("work_date", nextMonth)
    .order("work_date", { ascending: false });

  const monthRows = (monthRowsRaw ?? []) as AttendanceRow[];

  // Người có quyền quản lý chấm công: xem/sửa/xoá/xuất toàn công ty.
  const canManage = canManageAttendance(
    user.system_role,
    user.can_manage_attendance,
  );

  let adminRows: AdminAttendanceRow[] = [];
  let adminUsers: AttendanceUserOption[] = [];
  if (canManage) {
    const [{ data: attRaw }, { data: userRaw }] = await Promise.all([
      supabase
        .from("attendance")
        .select(
          "id, user_id, work_date, check_in_at, check_out_at, work_hours, is_late, note, user:users!attendance_user_id_fkey(full_name, real_name, department:departments(name))",
        )
        .gte("work_date", monthStart)
        .lt("work_date", nextMonth)
        .order("work_date", { ascending: false }),
      supabase
        .from("users")
        .select("id, full_name")
        .eq("account_status", "active")
        .order("full_name"),
    ]);

    type AdminRaw = {
      id: string;
      user_id: string;
      work_date: string;
      check_in_at: string | null;
      check_out_at: string | null;
      work_hours: number | null;
      is_late: boolean;
      note: string | null;
      user: {
        full_name: string;
        real_name: string | null;
        department: { name: string } | null;
      } | null;
    };

    adminRows = ((attRaw ?? []) as unknown as AdminRaw[]).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      user_name: r.user?.full_name ?? "—",
      real_name: r.user?.real_name ?? null,
      dept_name: r.user?.department?.name ?? null,
      work_date: r.work_date,
      check_in_at: r.check_in_at,
      check_out_at: r.check_out_at,
      work_hours: r.work_hours,
      is_late: r.is_late,
      note: r.note,
    }));
    adminUsers = (userRaw ?? []) as AttendanceUserOption[];
  }

  // Quản lý cấp thấp hơn (manager/executive không có cờ): chỉ xem hôm nay của nhóm.
  const canSeeTeam = !canManage && canApprove(user.system_role);
  let teamToday: TeamTodayRow[] = [];
  if (canSeeTeam) {
    const { data } = await supabase
      .from("attendance")
      .select(
        "id, check_in_at, check_out_at, work_hours, is_late, user:users!attendance_user_id_fkey(full_name)",
      )
      .eq("work_date", workDate)
      .order("check_in_at", { ascending: true });
    teamToday = (data ?? []) as unknown as TeamTodayRow[];
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Chấm công</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Bấm giờ vào khi bắt đầu làm và giờ ra khi kết thúc. Hệ thống tự tính
          tổng giờ làm và đánh dấu đi trễ.
        </p>
      </div>

      <CheckInOutCard today={(todayRow as TodayAttendance) ?? null} />

      <Card>
        <CardHeader>
          <CardTitle>Bảng chấm công của tôi</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceMonthTable rows={monthRows} month={month} />
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Quản lý chấm công công ty</CardTitle>
            <p className="text-muted-foreground text-sm">
              Xem, chấm bù, chỉnh sửa và xuất báo cáo chấm công cho toàn công ty.
            </p>
          </CardHeader>
          <CardContent>
            <AttendanceAdminPanel
              rows={adminRows}
              users={adminUsers}
              month={month}
            />
          </CardContent>
        </Card>
      )}

      {canSeeTeam && (
        <Card>
          <CardHeader>
            <CardTitle>Hôm nay tại công ty</CardTitle>
          </CardHeader>
          <CardContent>
            {teamToday.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Chưa có ai chấm công hôm nay.
              </p>
            ) : (
              <ul className="divide-y">
                {teamToday.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <span className="font-medium">
                      {t.user?.full_name ?? "—"}
                    </span>
                    <span className="text-muted-foreground flex items-center gap-3 tabular-nums">
                      <span>Vào {formatVnTime(t.check_in_at)}</span>
                      <span>Ra {formatVnTime(t.check_out_at)}</span>
                      {t.check_out_at && (
                        <span>{formatWorkHours(t.work_hours)}</span>
                      )}
                      {t.is_late && (
                        <Badge
                          variant="outline"
                          className="border-amber-500 text-amber-600"
                        >
                          Trễ
                        </Badge>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
