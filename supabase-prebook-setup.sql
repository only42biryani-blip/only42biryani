-- Pre-booking for the next day(s) when the kitchen is offline or sold out. Run in Supabase -> SQL Editor -> New query.
-- Safe to run more than once.

-- The day the customer wants the food (India date). Empty = an ordinary same-day order.
alter table public.orders add column if not exists scheduled_for date;

-- Owner switch (admin -> Delivery & pay): are pre-bookings accepted?
alter table public.settings add column if not exists accept_prebook boolean not null default true;

-- Places a pre-booked cash / UPI order. It does NOT touch today's plate count; instead it checks that the chosen
-- day does not go over 42 plates in total.
create or replace function public.place_prebook_order(
  p_code text, p_qty int, p_mrp numeric, p_discount_percent numeric, p_discount_amount numeric,
  p_plate_price numeric, p_delivery_fee numeric, p_total numeric,
  p_name text, p_phone text, p_email text, p_address text, p_note text,
  p_lat double precision, p_lng double precision, p_source text, p_date date
) returns uuid
language plpgsql
as $$
declare
  booked int;
  new_id uuid;
begin
  perform 1 from public.inventory where id = 1 for update; -- one booking at a time, so two people cannot take the last plate
  select coalesce(sum(qty), 0) into booked from public.orders
    where scheduled_for = p_date and status not in ('cancelled', 'refunded', 'expired');
  if booked + p_qty > 42 then
    raise exception 'sold_out';
  end if;
  insert into public.orders (code, status, qty, plate_price, delivery_fee, total, customer_name, customer_phone,
                             customer_email, address, note, payment_mode, lat, lng, mrp, discount_percent,
                             discount_amount, source, scheduled_for)
  values (p_code, 'new', p_qty, p_plate_price, p_delivery_fee, p_total, p_name, p_phone, p_email, p_address, p_note,
          'cod', p_lat, p_lng, p_mrp, p_discount_percent, p_discount_amount, p_source, p_date)
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.place_prebook_order(text,int,numeric,numeric,numeric,numeric,numeric,numeric,text,text,text,text,text,double precision,double precision,text,date) from public, anon, authenticated;
grant execute on function public.place_prebook_order(text,int,numeric,numeric,numeric,numeric,numeric,numeric,text,text,text,text,text,double precision,double precision,text,date) to service_role;
