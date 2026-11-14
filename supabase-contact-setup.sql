-- Contact requests: visitors who urgently need us fill a form instead of seeing our phone number.
-- Run in Supabase -> SQL Editor -> New query. Safe to run more than once.
--
-- Only the website server (service role) can read or write this table. It holds customers' phone numbers,
-- so row-level security is ON with no public policy.
create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  message text,
  order_code text,
  status text not null default 'new' check (status in ('new', 'done')),
  approved_at timestamptz
);
create index if not exists contact_requests_created_idx on public.contact_requests (created_at desc);
alter table public.contact_requests enable row level security;
