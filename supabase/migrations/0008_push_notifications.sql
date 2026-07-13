-- 0008_push_notifications.sql
-- Thông báo đẩy (Web Push): lưu đăng ký thiết bị + tự gọi API gửi push khi có
-- thông báo mới. Dùng pg_net để trigger POST sang route /api/push/notify của app.

create extension if not exists pg_net;

-- ---------- Đăng ký thiết bị nhận push ----------
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_push_sub_user on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

-- Mỗi người chỉ thao tác với đăng ký của chính mình.
drop policy if exists push_sub_select_own on push_subscriptions;
create policy push_sub_select_own on push_subscriptions for select
  using (user_id = auth.uid());
drop policy if exists push_sub_insert_own on push_subscriptions;
create policy push_sub_insert_own on push_subscriptions for insert
  with check (user_id = auth.uid());
drop policy if exists push_sub_update_own on push_subscriptions;
create policy push_sub_update_own on push_subscriptions for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists push_sub_delete_own on push_subscriptions;
create policy push_sub_delete_own on push_subscriptions for delete
  using (user_id = auth.uid());

-- ---------- Cấu hình đích gửi push (1 dòng duy nhất) ----------
-- base_url = URL công khai của app (VD https://xxx.vercel.app); secret = khoá xác
-- thực webhook (khớp PUSH_WEBHOOK_SECRET). RLS bật + KHÔNG có policy → client
-- không đọc được; chỉ trigger (security definer) và service role truy cập.
create table if not exists push_config (
  id        boolean primary key default true,
  base_url  text,
  secret    text,
  constraint push_config_singleton check (id)
);
alter table push_config enable row level security;

insert into push_config (id, base_url, secret)
  values (true, null, null)
  on conflict (id) do nothing;

-- ---------- Trigger: gọi API gửi push mỗi khi có thông báo mới ----------
create or replace function notify_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_secret text;
begin
  select base_url, secret into v_base, v_secret from push_config where id = true;
  if v_base is null or v_base = '' then
    return new; -- chưa cấu hình URL → bỏ qua, không lỗi.
  end if;

  perform net.http_post(
    url := v_base || '/api/push/notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', coalesce(v_secret, '')
    ),
    body := jsonb_build_object('notification_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_push on notifications;
create trigger trg_notify_push
  after insert on notifications
  for each row execute function notify_push_on_notification();
