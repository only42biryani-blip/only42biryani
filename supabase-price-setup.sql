-- Plate price and offer, editable in /admin -> Delivery & pay -> Price and offer.
-- Run in Supabase -> SQL Editor -> New query. Safe to run more than once.
--
-- plate_price   : full price of one plate in rupees. Empty = use PLATE_PRICE from Vercel / the website default.
-- offer_percent : discount in percent (0 = no offer). Empty = use the website default (50%).
alter table public.settings add column if not exists plate_price numeric;
alter table public.settings add column if not exists offer_percent numeric;

alter table public.settings drop constraint if exists settings_plate_price_check;
alter table public.settings add constraint settings_plate_price_check check (plate_price is null or (plate_price >= 1 and plate_price <= 5000));
alter table public.settings drop constraint if exists settings_offer_percent_check;
alter table public.settings add constraint settings_offer_percent_check check (offer_percent is null or (offer_percent >= 0 and offer_percent <= 90));
