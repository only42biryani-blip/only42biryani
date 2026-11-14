-- Deliver only inside Hyderabad: editable in /admin -> Delivery & pay -> Delivery area.
-- Run in Supabase -> SQL Editor -> New query. Safe to run more than once.
-- (Orders are already limited to Hyderabad without this file; it only adds the switch and the radius.)
--
-- city_only      : true = accept orders only from inside Hyderabad (default).
-- city_radius_km : how far from the city centre still counts as Hyderabad (default 35 km).
alter table public.settings add column if not exists city_only boolean not null default true;
alter table public.settings add column if not exists city_radius_km numeric not null default 35;

alter table public.settings drop constraint if exists settings_city_radius_check;
alter table public.settings add constraint settings_city_radius_check check (city_radius_km >= 10 and city_radius_km <= 100);
