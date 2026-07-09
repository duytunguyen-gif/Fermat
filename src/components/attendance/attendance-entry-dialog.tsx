"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveManualAttendance } from "@/lib/actions/attendance";
import { todayWorkDate } from "@/lib/constants/attendance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type EntryInitial = {
  work_date: string;
  check_in_time: string; // "HH:mm" hoặc ""
  check_out_time: string;
  note: string;
};

export function AttendanceEntryDialog({
  trigger,
  initial,
  targetUserId,
  targetName,
  lockDate = false,
}: {
  trigger: React.ReactNode;
  /** Giá trị ban đầu khi SỬA; bỏ trống = tạo mới cho hôm nay. */
  initial?: EntryInitial;
  /** Chấm hộ người khác (cần quyền quản lý chấm công). Bỏ trống = chính mình. */
  targetUserId?: string;
  targetName?: string;
  /** Khoá ô ngày (khi sửa 1 ngày cụ thể). */
  lockDate?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [workDate, setWorkDate] = useState(initial?.work_date ?? todayWorkDate());
  const [checkIn, setCheckIn] = useState(initial?.check_in_time ?? "");
  const [checkOut, setCheckOut] = useState(initial?.check_out_time ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  // Đồng bộ lại khi mở dialog (phòng khi initial đổi giữa các dòng).
  function onOpenChange(next: boolean) {
    if (next) {
      setWorkDate(initial?.work_date ?? todayWorkDate());
      setCheckIn(initial?.check_in_time ?? "");
      setCheckOut(initial?.check_out_time ?? "");
      setNote(initial?.note ?? "");
    }
    setOpen(next);
  }

  function submit() {
    startTransition(async () => {
      const res = await saveManualAttendance({
        work_date: workDate,
        check_in_time: checkIn,
        check_out_time: checkOut,
        note,
        target_user_id: targetUserId,
      });
      if (res.status === "error") {
        toast.error(res.message);
      } else {
        toast.success(res.message);
        setOpen(false);
        router.refresh();
      }
    });
  }

  const isEdit = Boolean(initial);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Sửa chấm công" : "Chấm công thủ công"}
            {targetName ? ` — ${targetName}` : ""}
          </DialogTitle>
          <DialogDescription>
            Chọn ngày và nhập giờ vào / giờ ra. Dùng khi quên chấm hoặc chấm bù
            cuối ngày. Hệ thống tự tính tổng giờ và đánh dấu đi trễ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="att-date">Ngày</Label>
            <Input
              id="att-date"
              type="date"
              value={workDate}
              max={todayWorkDate()}
              disabled={lockDate}
              onChange={(e) => setWorkDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="att-in">Giờ vào</Label>
              <Input
                id="att-in"
                type="time"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-out">Giờ ra</Label>
              <Input
                id="att-out"
                type="time"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="att-note">Ghi chú (không bắt buộc)</Label>
            <Input
              id="att-note"
              value={note}
              maxLength={300}
              placeholder="VD: quên chấm công, ra ngoài công tác…"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={pending || !checkIn}>
            {pending ? "Đang lưu…" : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
