-- Run AFTER supabase-admin-setup.sql. Supabase Dashboard -> SQL Editor -> New query.
-- Safe to run more than once.

-- 1. Extra waitlist columns (signup date, consent record, which link they came from).
--    Existing signups get today's date as created_at; consent stays empty for them.
alter table public.waitlist add column if not exists created_at timestamptz default now();
alter table public.waitlist add column if not exists consent boolean;
alter table public.waitlist add column if not exists consented_at timestamptz;
alter table public.waitlist add column if not exists source text;

-- Admin can delete entries (test rows, opt-outs).
drop policy if exists "Admin deletes waitlist entries" on public.waitlist;
create policy "Admin deletes waitlist entries"
on public.waitlist for delete
to authenticated
using (
  (auth.jwt() ->> 'email') = 'only42biryani@gmail.com'
  and (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
);

-- 2. Launch settings: one row controlled from /admin (no redeploy needed to go live).
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  launched boolean not null default false,
  launch_at timestamptz,
  banner text
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

alter table public.settings enable row level security;

drop policy if exists "Anyone can read settings" on public.settings;
create policy "Anyone can read settings"
on public.settings for select
to anon, authenticated
using (true);

drop policy if exists "Admin updates settings" on public.settings;
create policy "Admin updates settings"
on public.settings for update
to authenticated
using (
  (auth.jwt() ->> 'email') = 'only42biryani@gmail.com'
  and (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
)
with check (
  (auth.jwt() ->> 'email') = 'only42biryani@gmail.com'
  and (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
);

-- 3. Log of every plate-count change, so mistakes can be traced.
create table if not exists public.inventory_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  old_value int,
  new_value int,
  actor text
);

alter table public.inventory_log enable row level security;

drop policy if exists "Admin writes inventory log" on public.inventory_log;
create policy "Admin writes inventory log"
on public.inventory_log for insert
to authenticated
with check (
  (auth.jwt() ->> 'email') = 'only42biryani@gmail.com'
  and (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
);

drop policy if exists "Admin reads inventory log" on public.inventory_log;
create policy "Admin reads inventory log"
on public.inventory_log for select
to authenticated
using (
  (auth.jwt() ->> 'email') = 'only42biryani@gmail.com'
  and (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
);
