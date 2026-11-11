-- Delivery range and delivery charges, editable from /admin -> Delivery. Run in Supabase -> SQL Editor -> New query.
-- Safe to run more than once.
--
-- kitchen_lat / kitchen_lng : where your kitchen is (set it in /admin by pressing "Use my current location" at the kitchen)
-- max_km        : farthest delivery distance. Customers beyond it are told BEFORE they order (no payment, no refund needed)
-- free_km       : delivery is just the base fee up to this distance
-- base_fee      : delivery charge in rupees up to free_km (0 = free)
-- per_km_fee    : extra rupees for every km beyond free_km (rounded up to whole km)
-- require_pin   : true = customers must share their live location so the distance can be measured
alter table public.settings add column if not exists kitchen_lat double precision;
alter table public.settings add column if not exists kitchen_lng double precision;
alter table public.settings add column if not exists max_km numeric not null default 5;
alter table public.settings add column if not exists free_km numeric not null default 2;
alter table public.settings add column if not exists base_fee numeric not null default 0;
alter table public.settings add column if not exists per_km_fee numeric not null default 10;
alter table public.settings add column if not exists require_pin boolean not null default true;

-- Distance saved with each order so you can see how far it is.
alter table public.orders add column if not exists distance_km numeric;
alter table public.orders add column if not exists delivered_by text;
