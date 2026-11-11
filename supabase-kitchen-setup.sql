-- Daily "kitchen online" switch + bell times. Run in Supabase Dashboard -> SQL Editor -> New query.
-- Safe to run more than once.
--
-- online_until : the kitchen is ONLINE until this moment, then it goes offline by itself (so every day you
--                press "Go online" again). Empty = offline.
-- close_time   : the usual closing time (IST), used as the default "online until".
-- reminder_time: the time (IST) when the admin page starts ringing the bell if you are still offline.
alter table public.settings add column if not exists online_until timestamptz;
alter table public.settings add column if not exists close_time text not null default '22:00';
alter table public.settings add column if not exists reminder_time text not null default '10:30';
