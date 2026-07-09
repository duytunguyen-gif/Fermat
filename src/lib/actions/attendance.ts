"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canManageAttendance } from "@/lib/auth/permissions";
import { todayWorkDate } from "@/lib/constants/attendance";
import {
  manualAttendanceSchema,
  type ManualAttendanceInput,
} from "@/lib/validations/attendance.schema";
import { type ActionState, errorState, successState } from "./action-result";
import { zodFieldErrors } from "./zod-errors";

/**
 * Ghép ngày (yyyy-mm-dd) + giờ (HH:mm) theo múi giờ VN (+07:00) thành ISO timestamptz.
 * Trả về null nếu giờ trống.
 */
function vnTimestamp(date: string, time: string): string | null {
  if (!time) return null;
  return new Date(`${date}T${time}:00+07:00`).toISOString();
}

/**
 * Chấm công VÀO cho chính mình (ngày hôm nay, múi giờ VN).
 * Idempotent trong ngày: đã chấm vào rồi thì báo lại, không ghi đè giờ vào.
 */
export async function checkIn(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");
  if (user.account_status !== "active") {
    return errorState("Tài khoản chưa được kích hoạt.");
  }

  const supabase = await createClient();
  const workDate = todayWorkDate();

  const { data: existing } = await supabase
    .from("attendance")
    .select("id, check_in_at")
    .eq("user_id", user.id)
    .eq("work_date", workDate)
    .maybeSingle();

  if (existing?.check_in_at) {
    return errorState("Hôm nay bạn đã chấm công vào rồi.");
  }

  const now = new Date().toISOString();

  const { error } = existing
    ? await supabase
        .from("attendance")
        .update({ check_in_at: now })
        .eq("id", existing.id)
    : await supabase.from("attendance").insert({
        user_id: user.id,
        work_date: workDate,
        check_in_at: now,
        recorded_by: user.id,
      });

  if (error) return errorState(error.message);

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return successState("Đã chấm công vào. Chúc bạn ngày làm việc hiệu quả!");
}

/**
 * Chấm công RA cho chính mình (ngày hôm nay). Bấm lại sẽ cập nhật giờ ra mới nhất.
 * Bắt buộc đã chấm vào trước đó.
 */
export async function checkOut(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");
  if (user.account_status !== "active") {
    return errorState("Tài khoản chưa được kích hoạt.");
  }

  const supabase = await createClient();
  const workDate = todayWorkDate();

  const { data: existing } = await supabase
    .from("attendance")
    .select("id, check_in_at")
    .eq("user_id", user.id)
    .eq("work_date", workDate)
    .maybeSingle();

  if (!existing?.check_in_at) {
    return errorState("Bạn chưa chấm công vào hôm nay.");
  }

  const { error } = await supabase
    .from("attendance")
    .update({ check_out_at: new Date().toISOString() })
    .eq("id", existing.id);

  if (error) return errorState(error.message);

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return successState("Đã chấm công ra. Hẹn gặp lại!");
}

/**
 * Chấm công THỦ CÔNG hoặc CHỈNH SỬA: tự chọn ngày + giờ vào/ra.
 * - Dùng cho trường hợp quên chấm, chấm cuối ngày, hoặc sửa lại giờ.
 * - `target_user_id` khác mình → phải có quyền quản lý chấm công.
 * - Tạo mới nếu ngày đó chưa có bản ghi, ngược lại cập nhật.
 */
export async function saveManualAttendance(
  input: ManualAttendanceInput,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");
  if (user.account_status !== "active") {
    return errorState("Tài khoản chưa được kích hoạt.");
  }

  const parsed = manualAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return errorState(
      "Vui lòng kiểm tra lại thông tin.",
      zodFieldErrors(parsed.error),
    );
  }
  const data = parsed.data;

  // Xác định người được chấm. Chấm hộ người khác cần quyền quản lý chấm công.
  const targetId = data.target_user_id ?? user.id;
  const isSelf = targetId === user.id;
  const canManage = canManageAttendance(
    user.system_role,
    user.can_manage_attendance,
  );
  if (!isSelf && !canManage) {
    return errorState("Bạn không có quyền chấm công cho người khác.");
  }

  const checkIn = vnTimestamp(data.work_date, data.check_in_time);
  const checkOut = vnTimestamp(data.work_date, data.check_out_time);

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("user_id", targetId)
    .eq("work_date", data.work_date)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("attendance")
        .update({
          check_in_at: checkIn,
          check_out_at: checkOut,
          note: data.note || null,
        })
        .eq("id", existing.id)
    : await supabase.from("attendance").insert({
        user_id: targetId,
        work_date: data.work_date,
        check_in_at: checkIn,
        check_out_at: checkOut,
        note: data.note || null,
        recorded_by: user.id,
      });

  if (error) return errorState(error.message);

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return successState(existing ? "Đã cập nhật chấm công." : "Đã lưu chấm công.");
}

/** Xoá một bản ghi chấm công (của mình hoặc người có quyền quản lý chấm công — RLS enforce). */
export async function deleteAttendance(id: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return errorState("Bạn cần đăng nhập.");

  const supabase = await createClient();
  const { error } = await supabase.from("attendance").delete().eq("id", id);
  if (error) return errorState(error.message);

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return successState("Đã xoá bản ghi chấm công.");
}
