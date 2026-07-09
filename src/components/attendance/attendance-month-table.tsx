"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { AttendanceEntryDialog } from "./attendance-entry-dialog";

export type AttendanceRow = {
  id: string;
  work_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  work_hours: number | null;
  is_late: boolean;
  note: string | null;
};

/** Dịch chuyển "yyyy-mm" thêm/bớt số tháng. */
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `Tháng ${m}/${y}`;
}

export function AttendanceMonthTable({
  rows,
  month,
}: {
  rows: AttendanceRow[];
  month: string;
}) {
  const router = useRouter();

  const daysWorked = rows.filter((r) => r.check_in_at).length;
  const lateCount = rows.filter((r) => r.is_late).length;
  const totalHours = rows.reduce((s, r) => s + (r.work_hours ?? 0), 0);

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

  return (
    <div className="space-y-4">
      {/* Thanh chọn tháng + tổng hợp */}
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

        <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>
            Ngày công:{" "}
            <span className="text-foreground font-medium">{daysWorked}</span>
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
      </div>

      {rows.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-sm">
          <CalendarDays className="size-8 opacity-40" />
          Chưa có dữ liệu chấm công trong {monthLabel(month).toLowerCase()}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày</TableHead>
                <TableHead>Giờ vào</TableHead>
                <TableHead>Giờ ra</TableHead>
                <TableHead>Tổng giờ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead className="text-right">Sửa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {formatVnDate(r.work_date)}
                  </TableCell>
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
                  <TableCell className="text-muted-foreground max-w-48 truncate">
                    {r.note || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <AttendanceEntryDialog
                      lockDate
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
