-- Self-delivery orders, confirm order, editable bills + waitlist addresses. Run in Supabase Dashboard -> SQL Editor -> New query.
-- Safe to run more than once. Run AFTER supabase-orders-setup.sql.

-- 1. Extra order columns: where, how much was discounted, and how it was paid.
alter table public.orders add column if not exists payment_mode text not null default 'online';  -- online | cod
alter table public.orders add column if not exists paid_by text;                                  -- cash | upi | online
alter table public.orders add column if not exists lat double precision;
alter table public.orders add column if not exists lng double precision;
alter table public.orders add column if not exists mrp numeric(10,2);                  -- price of one plate before the offer
alter table public.orders add column if not exists discount_percent numeric(5,2) not null default 0;
alter table public.orders add column if not exists discount_amount numeric(10,2) not null default 0;
alter table public.orders add column if not exists source text;                         -- website | manual (typed in by you)
alter table public.orders add column if not exists confirmed_at timestamptz;             -- when you confirmed the order
alter table public.orders add column if not exists bill jsonb;                           -- the edited bill (items, discount, notes), if you changed it

-- 2. Place an order that is paid on delivery (cash or UPI). Takes the plates at once; no payment hold.
create or replace function public.place_self_order(
  p_code text, p_qty int, p_mrp numeric, p_discount_percent numeric, p_discount_amount numeric,
  p_plate_price numeric, p_delivery_fee numeric, p_total numeric,
  p_name text, p_phone text, p_email text, p_address text, p_note text,
  p_lat double precision, p_lng double precision, p_source text
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
  insert into public.orders (code, status, qty, plate_price, delivery_fee, total, customer_name, customer_phone,
                             customer_email, address, note, payment_mode, lat, lng, mrp, discount_percent,
                             discount_amount, source)
  values (p_code, 'new', p_qty, p_plate_price, p_delivery_fee, p_total, p_name, p_phone, p_email, p_address, p_note,
          'cod', p_lat, p_lng, p_mrp, p_discount_percent, p_discount_amount, p_source)
  returning id into new_id;
  return new_id;
end;
$$;

-- 3. Cancel now also understands the new 'new' and 'confirmed' statuses.
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
  if p_restore and o.status in ('pending_payment','new','confirmed','paid','preparing','ready','dispatched') then
    update public.inventory set remaining = least(42, remaining + o.qty) where id = 1;
  end if;
  update public.orders set status = 'cancelled' where id = o.id;
  return 'cancelled';
end;
$$;

revoke all on function public.place_self_order(text,int,numeric,numeric,numeric,numeric,numeric,numeric,text,text,text,text,text,double precision,double precision,text) from public, anon, authenticated;
grant execute on function public.place_self_order(text,int,numeric,numeric,numeric,numeric,numeric,numeric,text,text,text,text,text,double precision,double precision,text) to service_role;
revoke all on function public.cancel_order(text,boolean) from public, anon, authenticated;
grant execute on function public.cancel_order(text,boolean) to service_role;

-- 4. Waitlist: a place to paste the address / Google Maps link people sent you on WhatsApp.
alter table public.waitlist add column if not exists address text;
alter table public.waitlist add column if not exists address_updated_at timestamptz;

drop policy if exists "Admin updates waitlist" on public.waitlist;
create policy "Admin updates waitlist"
on public.waitlist for update
to authenticated
using (
  (auth.jwt() ->> 'email') = 'only42biryani@gmail.com'
  and (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
)
with check (
  (auth.jwt() ->> 'email') = 'only42biryani@gmail.com'
  and (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
);
