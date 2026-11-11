-- Payment choices, editable in /admin -> Delivery & pay. Run in Supabase -> SQL Editor -> New query. Safe to run more than once.
-- accept_cod : true = customers may choose cash / UPI on delivery
-- online_pay : 'off' = no online payment for customers, 'test' = only you (secret test link), 'on' = everyone
alter table public.settings add column if not exists accept_cod boolean not null default true;
alter table public.settings add column if not exists online_pay text not null default 'off';

-- Delivery charge cap and optional range limit (edit them in /admin -> Delivery & pay).
-- max_fee     : the most a customer ever pays for delivery, in rupees (empty = no cap). Default 40.
-- range_limit : false = deliver anywhere (nothing flagged TOO FAR); true = flag orders beyond max_km.
alter table public.settings add column if not exists max_fee numeric default 40;
alter table public.settings add column if not exists range_limit boolean not null default false;
