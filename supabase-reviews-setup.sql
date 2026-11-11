-- Customer reviews with your approval. Run in Supabase Dashboard -> SQL Editor -> New query.
-- Safe to run more than once.
--
-- How it works: anyone can SEND a review, but it starts as "pending" and nobody can see it on the website.
-- Only reviews you set to "approved" in /admin are shown. You can hide or delete any review later.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 60),
  rating int not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 5 and 600),
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden'))
);

create index if not exists reviews_status_idx on public.reviews (status, created_at desc);

alter table public.reviews enable row level security;

-- Visitors may send a review (always as pending) and may read only the approved ones.
drop policy if exists "Anyone can send a review" on public.reviews;
create policy "Anyone can send a review"
on public.reviews for insert
to anon, authenticated
with check (status = 'pending');

drop policy if exists "Anyone can read approved reviews" on public.reviews;
create policy "Anyone can read approved reviews"
on public.reviews for select
to anon, authenticated
using (status = 'approved');

-- Only the admin can see everything, approve/hide, and delete.
drop policy if exists "Admin reads all reviews" on public.reviews;
create policy "Admin reads all reviews"
on public.reviews for select
to authenticated
using (
  (auth.jwt() ->> 'email') = 'only42biryani@gmail.com'
  and (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
);

drop policy if exists "Admin updates reviews" on public.reviews;
create policy "Admin updates reviews"
on public.reviews for update
to authenticated
using (
  (auth.jwt() ->> 'email') = 'only42biryani@gmail.com'
  and (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
)
with check (
  (auth.jwt() ->> 'email') = 'only42biryani@gmail.com'
  and (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
);

drop policy if exists "Admin deletes reviews" on public.reviews;
create policy "Admin deletes reviews"
on public.reviews for delete
to authenticated
using (
  (auth.jwt() ->> 'email') = 'only42biryani@gmail.com'
  and (auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
);

-- Two switches you control from /admin:
--   show_reviews   = show the reviews section on the website at all
--   accept_reviews = let visitors write new reviews (off until you have real customers)
alter table public.settings add column if not exists show_reviews boolean not null default true;
alter table public.settings add column if not exists accept_reviews boolean not null default false;
