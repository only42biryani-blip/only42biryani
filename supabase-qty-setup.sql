-- More than 5 plates per order, with a limit you choose in /admin -> Delivery & pay -> Price and offer.
-- Run in Supabase -> SQL Editor -> New query. Safe to run more than once.
--
-- orders.qty    : was limited to 1-5 plates by the database itself. Now 1-42 (a day's batch).
-- settings.max_qty : the most plates ONE order may have (default 10). Customers can also never order more than the
--                    plates left that day.

-- Remove the old "1 to 5" rule, whatever it is called, then add the new one.
alter table public.orders drop constraint if exists orders_qty_check;
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.orders'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%qty%'
  loop
    execute format('alter table public.orders drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.orders add constraint orders_qty_check check (qty between 1 and 42);

alter table public.settings add column if not exists max_qty int not null default 10;
alter table public.settings drop constraint if exists settings_max_qty_check;
alter table public.settings add constraint settings_max_qty_check check (max_qty between 1 and 42);
