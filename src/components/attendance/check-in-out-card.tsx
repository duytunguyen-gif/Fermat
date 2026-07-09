"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, Clock, AlertTriangle, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { checkIn, checkOut } from "@/lib/actions/attendance";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatVnTime,
  formatWorkHours,
  STANDARD_START_LABEL,
  vnTimeValue,
  todayWorkDate,
} from "@/lib/constants/attendance";
import { AttendanceEntryDialog } from "./attendance-entry-dialog";

export type TodayAttendance = {
  check_in_at: string | null;
  check_out_at: string | null;
  work_hours: number | null;
  is_late: boolean;
} | null;

export function CheckInOutCard({ today }: { today: TodayAttendance }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const checkedIn = Boolean(today?.check_in_at);
  const checkedOut = Boolean(today?.check_out_at);

  function run(action: () => Promise<{ status: string; message?: string }>) {
    startTransition(async () => {
      const res = await action();
      if (res.status === "error") toast.error(res.message);
      else {
        toast.success(res.message);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Chấm công hôm nay</p>
              <p className="text-muted-foreground text-xs">
                Giờ vào chuẩn: {STANDARD_START_LABEL}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Vào:</span>
            <span className="font-medium tabular-nums">
              {formatVnTime(today?.check_in_at ?? null)}
            </span>
            {today?.is_late && (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                <AlertTriangle className="size-3" />
                Đi trễ
              </Badge>
            )}
            <span className="text-muted-foreground ml-2">Ra:</span>
            <span className="font-medium tabular-nums">
              {formatVnTime(today?.check_out_at ?? null)}
            </span>
            {checkedOut && (
              <>
                <span className="text-muted-foreground ml-2">Tổng:</span>
                <span className="font-medium tabular-nums">
                  {formatWorkHours(today?.work_hours ?? null)}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex gap-2">
            <Button
              onClick={() => run(checkIn)}
              disabled={pending || checkedIn}
            >
              <LogIn className="size-4" />
              {checkedIn ? "Đã vào" : "Chấm công vào"}
            </Button>
            <Button
              variant="outline"
              onClick={() => run(checkOut)}
              disabled={pending || !checkedIn}
            >
              <LogOut className="size-4" />
              {checkedOut ? "Cập nhật giờ ra" : "Chấm công ra"}
            </Button>
          </div>
          <AttendanceEntryDialog
            initial={{
              work_date: todayWorkDate(),
              check_in_time: vnTimeValue(today?.check_in_at ?? null),
              check_out_time: vnTimeValue(today?.check_out_at ?? null),
              note: "",
            }}
            trigger={
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <PencilLine className="size-4" />
                Chọn giờ thủ công
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
