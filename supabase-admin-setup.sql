-- Run once in Supabase Dashboard -> SQL Editor -> New query.
-- Admin = only42biryani@gmail.com, signed in with Google.

-- 1. Remove every existing policy on these tables (this also removes any old
--    open "anyone can update/read" policies from the PIN-based admin).
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('waitlist', 'inventory')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.waitlist  enable row level security;
alter table public.inventory enable row level security;

-- 2. Waitlist: anyone can join, only the admin can read (phones and emails stay private).
create policy "Anyone can join the waitlist"
on public.waitlist for insert
to anon, authenticated
with check (true);

create policy "Admin reads the waitlist"
on public.waitlist for select
to authenticated
using (
  (auth.jwt() ->> 'email') = 'only42biryani@gmail.com'
  and (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
);

-- 3. Inventory: anyone can read the plate count, only the admin can change it.
create policy "Anyone can read inventory"
on public.inventory for select
to anon, authenticated
using (true);

create policy "Admin updates inventory"
on public.inventory for update
to authenticated
using (
  (auth.jwt() ->> 'email') = 'only42biryani@gmail.com'
  and (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
)
with check (
  (auth.jwt() ->> 'email') = 'only42biryani@gmail.com'
  and (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
);

-- 4. Public signup counter that exposes only a number, never the rows.
create or replace function public.waitlist_count()
returns bigint
language sql
security definer
set search_path = public
as $$ select count(*) from public.waitlist $$;

grant execute on function public.waitlist_count() to anon, authenticated;
