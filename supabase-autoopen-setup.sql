-- Automatic daily opening: the kitchen goes online by itself every day at the chosen time (default 11:00 IST)
-- and the day's plates start by themselves. Run in Supabase -> SQL Editor -> New query. Safe to run more than once.
--
-- auto_online_time : time (IST) when the kitchen opens each day. Empty = automatic opening is OFF.
-- auto_off_day     : the day the owner pressed "Go offline" / "Stay offline today" (no automatic opening that day).
-- drop_date        : the day the plate count was last reset to 42 (so it happens once per day).
alter table public.settings add column if not exists auto_online_time text default '11:00';
alter table public.settings add column if not exists auto_off_day date;
alter table public.settings add column if not exists drop_date date;

-- If today is already under way (it is past the opening time, or you switched the kitchen on by hand), mark today
-- as started so the first automatic reset does not wipe the plates you have already sold.
update public.settings
set drop_date = (now() at time zone 'Asia/Kolkata')::date
where id = 1
  and drop_date is null
  and (
    (case when auto_online_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
          then (now() at time zone 'Asia/Kolkata')::time >= auto_online_time::time
          else false end)
    or online_until > now()
  );

-- Resets today's plates to 42 minus the plates already pre-booked for today. Runs once per day.
create or replace function public.ensure_daily_drop(p_today date, p_total int default 42) returns int
language plpgsql
as $$
declare
  done date;
  booked int;
  left_plates int;
begin
  perform 1 from public.inventory where id = 1 for update; -- same lock as taking an order, so nothing is lost
  select drop_date into done from public.settings where id = 1;
  if done is not distinct from p_today then
    select remaining into left_plates from public.inventory where id = 1;
    return left_plates;
  end if;
  select coalesce(sum(qty), 0) into booked from public.orders
    where scheduled_for = p_today and status not in ('cancelled', 'refunded', 'expired');
  left_plates := greatest(0, p_total - booked);
  update public.inventory set remaining = left_plates where id = 1;
  update public.settings set drop_date = p_today where id = 1;
  return left_plates;
end;
$$;

revoke all on function public.ensure_daily_drop(date, int) from public, anon, authenticated;
grant execute on function public.ensure_daily_drop(date, int) to service_role;
