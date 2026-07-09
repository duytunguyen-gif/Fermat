-- ============================================================
-- FematTech — 0005 Chấm công (attendance)
--  Chấm công bằng bấm giờ VÀO / RA, nhân viên tự chấm.
--  Mỗi người mỗi ngày 1 bản ghi (chống trùng bằng unique user_id + work_date).
--  Trigger tự tính tổng giờ làm (work_hours) và đánh dấu đi trễ (is_late).
-- ============================================================

-- ---------- Bảng attendance ----------
create table if not exists attendance (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  work_date    date not null,                       -- ngày làm việc (múi giờ VN)
  check_in_at  timestamptz,                         -- giờ bấm "vào"
  check_out_at timestamptz,                         -- giờ bấm "ra"
  work_hours   numeric(5, 2),                       -- tổng giờ làm = ra - vào (trigger tính)
  is_late      boolean not null default false,      -- đi trễ so với giờ chuẩn (trigger tính)
  note         text,                                -- ghi chú (vd: ra ngoài công tác)
  recorded_by  uuid references users(id) on delete set null, -- ai chấm (hiện là chính mình)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (user_id, work_date),
  constraint chk_attendance_out_after_in
    check (check_out_at is null or check_in_at is null or check_out_at >= check_in_at)
);

create index if not exists idx_attendance_user_date on attendance(user_id, work_date desc);
create index if not exists idx_attendance_date on attendance(work_date desc);

-- ---------- Trigger: tự tính giờ làm + đi trễ ----------
-- Giờ vào chuẩn (giờ hành chính). Muốn đổi thì sửa hằng số v_start bên dưới.
create or replace function attendance_compute()
returns trigger language plpgsql as $$
declare
  v_start  time := time '08:00';           -- ⬅️ GIỜ VÀO CHUẨN, đổi ở đây nếu cần
  v_local  time;
begin
  -- Nếu chưa có ngày làm việc thì suy ra từ giờ vào (theo múi giờ VN).
  if new.work_date is null and new.check_in_at is not null then
    new.work_date := (new.check_in_at at time zone 'Asia/Ho_Chi_Minh')::date;
  end if;

  -- Đi trễ: so giờ vào (giờ VN) với giờ chuẩn.
  if new.check_in_at is not null then
    v_local := (new.check_in_at at time zone 'Asia/Ho_Chi_Minh')::time;
    new.is_late := v_local > v_start;
  else
    new.is_late := false;
  end if;

  -- Tổng giờ làm khi có đủ giờ vào và giờ ra.
  if new.check_in_at is not null and new.check_out_at is not null then
    new.work_hours := round(
      (extract(epoch from (new.check_out_at - new.check_in_at)) / 3600.0)::numeric, 2);
  else
    new.work_hours := null;
  end if;

  return new;
end;
$$;

create trigger trg_attendance_compute
  before insert or update on attendance
  for each row execute function attendance_compute();

create trigger trg_attendance_updated_at before update on attendance
  for each row execute function set_updated_at();

-- ---------- RLS ----------
alter table attendance enable row level security;

-- Xem: chính mình; Admin/Super Admin & Điều hành xem toàn công ty;
--      Trưởng phòng xem người trong cùng phòng ban.
create policy attendance_select on attendance for select
  using (
    user_id = auth.uid()
    or is_admin_or_above()
    or current_user_role() = 'executive'
    or (
      current_user_role() = 'manager'
      and exists (
        select 1 from users u
        where u.id = attendance.user_id
          and u.department_id = (select department_id from users where id = auth.uid())
      )
    )
  );

-- Tạo (chấm công vào): chỉ tự chấm cho chính mình.
create policy attendance_insert_self on attendance for insert
  with check (
    user_id = auth.uid()
    and recorded_by = auth.uid()
    and is_active_user()
  );

-- Sửa (chấm công ra / ghi chú): của chính mình, hoặc Admin chỉnh hộ.
create policy attendance_update on attendance for update
  using (user_id = auth.uid() or is_admin_or_above())
  with check (user_id = auth.uid() or is_admin_or_above());

-- Xoá: của chính mình hoặc Admin.
create policy attendance_delete on attendance for delete
  using (user_id = auth.uid() or is_admin_or_above());
