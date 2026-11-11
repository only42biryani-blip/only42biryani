-- Direct ordering: orders table + plate holding. Run in Supabase Dashboard -> SQL Editor -> New query.
-- Safe to run more than once. Run AFTER supabase-admin-setup.sql and supabase-launch-setup.sql.
--
-- Security: the orders table has Row Level Security ON and NO policies, so the public (anon) key can
-- never read or write it. Only our server, using the secret service-role key, touches it.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                       -- public order code shown to the customer
  status text not null default 'pending_payment',  -- pending_payment | paid | preparing | ready | dispatched
                                                   -- | delivered | cancelled | expired | paid_needs_refund | refunded
  qty int not null check (qty between 1 and 5),
  plate_price numeric(10,2) not null,
  delivery_fee numeric(10,2) not null,
  total numeric(10,2) not null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  address text not null,
  note text,
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  refund_id text,
  borzo_order_id bigint,
  borzo_status text,
  tracking_url text,
  courier_name text,
  courier_phone text,
  hold_expires_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  ready_at timestamptz,
  delivered_at timestamptz
);

create index if not exists orders_status_idx on public.orders (status, created_at desc);

alter table public.orders enable row level security;
-- (no policies on purpose)

-- Put plates back for holds that were never paid.
create or replace function public.release_expired_holds()
returns int
language plpgsql
as $$
declare
  n int := 0;
  r record;
begin
  for r in
    select id, qty from public.orders
    where status = 'pending_payment' and hold_expires_at < now()
    for update skip locked
  loop
    update public.orders set status = 'expired' where id = r.id;
    update public.inventory set remaining = least(42, remaining + r.qty) where id = 1;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Atomically take plates and create the order. Raises 'sold_out' if there are not enough plates.
create or replace function public.place_order_hold(
  p_code text, p_qty int, p_plate_price numeric, p_delivery_fee numeric, p_total numeric,
  p_name text, p_phone text, p_email text, p_address text, p_note text, p_hold_minutes int default 10
) returns uuid
language plpgsql
as $$
declare
  left_now int;
  new_id uuid;
begin
  perform public.release_expired_holds();
  select remaining into left_now from public.inventory where id = 1 for update;
  if left_now is null or left_now < p_qty then
    raise exception 'sold_out';
  end if;
  update public.inventory set remaining = remaining - p_qty where id = 1;
  insert into public.orders (code, qty, plate_price, delivery_fee, total, customer_name, customer_phone,
                             customer_email, address, note, hold_expires_at)
  values (p_code, p_qty, p_plate_price, p_delivery_fee, p_total, p_name, p_phone, p_email, p_address, p_note,
          now() + make_interval(mins => p_hold_minutes))
  returning id into new_id;
  return new_id;
end;
$$;

-- Payment confirmed. Idempotent. If the hold had already expired, re-take the plates if any are left;
-- otherwise flag the order for a refund.
create or replace function public.mark_order_paid(p_code text, p_payment_id text)
returns text
language plpgsql
as $$
declare
  o public.orders%rowtype;
  left_now int;
begin
  select * into o from public.orders where code = p_code for update;
  if not found then return 'not_found'; end if;
  if o.status in ('paid','preparing','ready','dispatched','delivered') then return 'already_paid'; end if;
  if o.status = 'pending_payment' then
    update public.orders set status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now(), hold_expires_at = null
    where id = o.id;
    return 'ok';
  end if;
  if o.status = 'expired' then
    select remaining into left_now from public.inventory where id = 1 for update;
    if left_now >= o.qty then
      update public.inventory set remaining = remaining - o.qty where id = 1;
      update public.orders set status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now(), hold_expires_at = null
      where id = o.id;
      return 'ok';
    end if;
    update public.orders set status = 'paid_needs_refund', razorpay_payment_id = p_payment_id, paid_at = now()
    where id = o.id;
    return 'needs_refund';
  end if;
  return o.status;
end;
$$;

-- Cancel an order. p_restore = true puts the plates back (use only if the food was not cooked for it).
create or replace function public.cancel_order(p_code text, p_restore boolean)
returns text
language plpgsql
as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where code = p_code for update;
  if not found then return 'not_found'; end if;
  if o.status in ('cancelled','refunded','expired','delivered') then return o.status; end if;
  if p_restore and o.status in ('pending_payment','paid','preparing','ready') then
    update public.inventory set remaining = least(42, remaining + o.qty) where id = 1;
  end if;
  update public.orders set status = 'cancelled' where id = o.id;
  return 'cancelled';
end;
$$;

-- Only the server (service role) may call these. The public keys must not.
revoke all on function public.release_expired_holds() from public, anon, authenticated;
revoke all on function public.place_order_hold(text,int,numeric,numeric,numeric,text,text,text,text,text,int) from public, anon, authenticated;
revoke all on function public.mark_order_paid(text,text) from public, anon, authenticated;
revoke all on function public.cancel_order(text,boolean) from public, anon, authenticated;
grant execute on function public.release_expired_holds() to service_role;
grant execute on function public.place_order_hold(text,int,numeric,numeric,numeric,text,text,text,text,text,int) to service_role;
grant execute on function public.mark_order_paid(text,text) to service_role;
grant execute on function public.cancel_order(text,boolean) to service_role;
