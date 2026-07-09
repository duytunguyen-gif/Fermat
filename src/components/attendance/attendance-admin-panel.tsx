"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Pencil,
  Trash2,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatVnTime,
  formatVnDate,
  formatWorkHours,
  vnTimeValue,
} from "@/lib/constants/attendance";
import {
  exportAttendanceExcel,
  exportAttendancePdf,
  type ExportRow,
} from "@/lib/attendance/export";
import { deleteAttendance } from "@/lib/actions/attendance";
import { AttendanceEntryDialog } from "./attendance-entry-dialog";

export type AdminAttendanceRow = {
  id: string;
  user_id: string;
  user_name: string;
  real_name: string | null;
  dept_name: string | null;
  work_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  work_hours: number | null;
  is_late: boolean;
  note: string | null;
};

export type AttendanceUserOption = { id: string; full_name: string };

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `Tháng ${m}/${y}`;
}

export function AttendanceAdminPanel({
  rows,
  users,
  month,
}: {
  rows: AdminAttendanceRow[];
  users: AttendanceUserOption[];
  month: string;
}) {
  const router = useRouter();
  const [filterUserId, setFilterUserId] = useState("");
  const [search, setSearch] = useState("");
  const [targetId, setTargetId] = useState("");

  const nowMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
  const isCurrentOrFuture = month >= nowMonth;

  function go(delta: number) {
    router.push(`/attendance?month=${shiftMonth(month, delta)}`);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterUserId && r.user_id !== filterUserId) return false;
      if (
        q &&
        !r.user_name.toLowerCase().includes(q) &&
        !(r.note ?? "").toLowerCase().includes(q) &&
        !(r.dept_name ?? "").toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [rows, filterUserId, search]);

  const totalHours = filtered.reduce((s, r) => s + (r.work_hours ?? 0), 0);
  const lateCount = filtered.filter((r) => r.is_late).length;

  function toExportRows(): ExportRow[] {
    return filtered.map((r) => ({
      user_name: r.user_name,
      real_name: r.real_name,
      dept_name: r.dept_name,
      work_date: r.work_date,
      check_in_at: r.check_in_at,
      check_out_at: r.check_out_at,
      work_hours: r.work_hours,
      is_late: r.is_late,
      note: r.note,
    }));
  }

  function onExportExcel() {
    if (filtered.length === 0) {
      toast.error("Không có dữ liệu để xuất.");
      return;
    }
    exportAttendanceExcel(toExportRows(), {
      fileLabel: month,
      periodLabel: monthLabel(month),
    });
  }

  function onExportPdf() {
    if (filtered.length === 0) {
      toast.error("Không có dữ liệu để xuất.");
      return;
    }
    exportAttendancePdf(toExportRows(), {
      fileLabel: month,
      periodLabel: monthLabel(month),
    });
  }

  const targetName = users.find((u) => u.id === targetId)?.full_name;

  return (
    <div className="space-y-4">
      {/* Hàng điều khiển: tháng + xuất báo cáo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => go(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">
            {monthLabel(month)}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => go(1)}
            disabled={isCurrentOrFuture}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExportExcel}>
            <FileSpreadsheet className="size-4" />
            Xuất Excel
          </Button>
          <Button variant="outline" size="sm" onClick={onExportPdf}>
            <FileText className="size-4" />
            Xuất PDF
          </Button>
        </div>
      </div>

      {/* Hàng lọc + thêm chấm công */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs sm:w-56"
            aria-label="Lọc theo nhân viên"
          >
            <option value="">Tất cả nhân viên</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
          <div className="relative sm:w-64">
            <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, phòng ban, ghi chú…"
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs sm:w-48"
            aria-label="Chọn nhân viên để chấm công"
          >
            <option value="">Chọn nhân viên…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
          <AttendanceEntryDialog
            targetUserId={targetId || undefined}
            targetName={targetName}
            trigger={
              <Button size="sm" disabled={!targetId}>
                <Plus className="size-4" />
                Thêm
              </Button>
            }
          />
        </div>
      </div>

      {/* Tổng hợp */}
      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>
          Số dòng:{" "}
          <span className="text-foreground font-medium">{filtered.length}</span>
        </span>
        <span>
          Tổng giờ:{" "}
          <span className="text-foreground font-medium">
            {formatWorkHours(totalHours)}
          </span>
        </span>
        <span>
          Số buổi trễ:{" "}
          <span className="text-foreground font-medium">{lateCount}</span>
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-sm">
          <CalendarDays className="size-8 opacity-40" />
          Không có dữ liệu chấm công phù hợp trong {monthLabel(month).toLowerCase()}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhân viên</TableHead>
                <TableHead className="hidden md:table-cell">Phòng ban</TableHead>
                <TableHead>Ngày</TableHead>
                <TableHead>Vào</TableHead>
                <TableHead>Ra</TableHead>
                <TableHead>Tổng giờ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.user_name}</TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {r.dept_name ?? "—"}
                  </TableCell>
                  <TableCell>{formatVnDate(r.work_date)}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatVnTime(r.check_in_at)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatVnTime(r.check_out_at)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatWorkHours(r.work_hours)}
                  </TableCell>
                  <TableCell>
                    {r.is_late ? (
                      <Badge
                        variant="outline"
                        className="border-amber-500 text-amber-600"
                      >
                        Đi trễ
                      </Badge>
                    ) : r.check_in_at ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500 text-emerald-600"
                      >
                        Đúng giờ
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <AttendanceEntryDialog
                        lockDate
                        targetUserId={r.user_id}
                        targetName={r.user_name}
                        initial={{
                          work_date: r.work_date,
                          check_in_time: vnTimeValue(r.check_in_at),
                          check_out_time: vnTimeValue(r.check_out_at),
                          note: r.note ?? "",
                        }}
                        trigger={
                          <Button size="sm" variant="ghost">
                            <Pencil className="size-4" />
                            <span className="sr-only">Sửa</span>
                          </Button>
                        }
                      />
                      <DeleteButton id={r.id} name={r.user_name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function DeleteButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!window.confirm(`Xoá bản ghi chấm công của ${name}?`)) return;
    startTransition(async () => {
      const res = await deleteAttendance(id);
      if (res.status === "error") toast.error(res.message);
      else toast.success(res.message);
    });
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-rose-600 hover:text-rose-700"
      onClick={onDelete}
      disabled={pending}
    >
      <Trash2 className="size-4" />
      <span className="sr-only">Xoá</span>
    </Button>
  );
}
