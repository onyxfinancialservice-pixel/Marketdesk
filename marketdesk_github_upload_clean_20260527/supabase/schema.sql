-- MarketDesk AI — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → paste & RUN
-- Safe to re-run (idempotent).

-- =========== Tables ===========

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_timeframe text not null default '1h',
  default_market text not null default 'crypto',
  theme text not null default 'light',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.watchlists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  market text not null default 'crypto',
  note text,
  created_at timestamptz not null default now(),
  unique (watchlist_id, symbol, market)
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  market text not null default 'crypto',
  condition text not null check (condition in ('price_above','price_below','rsi_above','rsi_below','pct_change_24h_above','pct_change_24h_below')),
  threshold numeric not null,
  active boolean not null default true,
  triggered_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.analysis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  market text not null,
  timeframe text not null,
  verdict text not null,
  combined_score numeric not null,
  summary text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_email text,
  symbol text not null,
  market text not null default 'crypto',
  timeframe text not null default '1h',
  bias text not null default 'neutral',
  confidence numeric,
  summary text,
  image_url text not null,
  image_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_date timestamptz not null default now(),
  symbol text not null,
  market text not null default 'crypto',
  side text not null default 'long',
  entry_price numeric,
  exit_price numeric,
  quantity numeric,
  fees numeric default 0,
  pnl numeric,
  strategy text,
  notes text,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create table if not exists public.payout_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  firm text not null,
  account_name text,
  account_size numeric,
  challenge_phase text,
  profit_target numeric,
  max_daily_loss numeric,
  max_loss numeric,
  current_balance numeric,
  next_payout_date date,
  payout_amount numeric,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payout_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payout_account_id uuid references public.payout_accounts(id) on delete cascade,
  record_date timestamptz not null default now(),
  amount numeric not null default 0,
  status text not null default 'requested',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists analysis_history_user_created_idx
  on public.analysis_history (user_id, created_at desc);
create index if not exists alerts_user_active_idx
  on public.alerts (user_id, active);
create index if not exists social_posts_created_idx
  on public.social_posts (created_at desc);
create index if not exists journal_entries_user_date_idx
  on public.journal_entries (user_id, trade_date desc);
create index if not exists payout_accounts_user_created_idx
  on public.payout_accounts (user_id, created_at desc);
create index if not exists payout_records_user_created_idx
  on public.payout_records (user_id, created_at desc);

-- =========== RLS ===========

alter table public.user_settings enable row level security;
alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.alerts enable row level security;
alter table public.analysis_history enable row level security;
alter table public.social_posts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.payout_accounts enable row level security;
alter table public.payout_records enable row level security;

-- helper: drop then create policies (idempotent)
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename in ('user_settings','watchlists','watchlist_items','alerts','analysis_history','social_posts','journal_entries','payout_accounts','payout_records')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

create policy "own user_settings"
  on public.user_settings for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own watchlists"
  on public.watchlists for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own watchlist_items"
  on public.watchlist_items for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own alerts"
  on public.alerts for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own analysis_history"
  on public.analysis_history for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "public read social_posts"
  on public.social_posts for select
  to anon, authenticated
  using (true);

create policy "own insert social_posts"
  on public.social_posts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "own update social_posts"
  on public.social_posts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own delete social_posts"
  on public.social_posts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "own journal_entries"
  on public.journal_entries for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own payout_accounts"
  on public.payout_accounts for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own payout_records"
  on public.payout_records for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- =========== Triggers ===========

create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists user_settings_updated_at on public.user_settings;
create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.tg_set_updated_at();

drop trigger if exists payout_accounts_updated_at on public.payout_accounts;
create trigger payout_accounts_updated_at
  before update on public.payout_accounts
  for each row execute function public.tg_set_updated_at();

-- =========== Storage ===========

insert into storage.buckets (id, name, public)
values ('social-images', 'social-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public read social images" on storage.objects;
drop policy if exists "authenticated upload social images" on storage.objects;
drop policy if exists "own update social images" on storage.objects;
drop policy if exists "own delete social images" on storage.objects;

create policy "public read social images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'social-images');

create policy "authenticated upload social images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'social-images' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "own update social images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'social-images' and (select auth.uid())::text = (storage.foldername(name))[1])
  with check (bucket_id = 'social-images' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "own delete social images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'social-images' and (select auth.uid())::text = (storage.foldername(name))[1]);

-- =========== Bootstrap helper for new users ===========

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_settings (user_id) values (new.id)
    on conflict do nothing;
  insert into public.watchlists (user_id, name) values (new.id, 'My Watchlist')
    on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
