-- ============================================================
-- Base schema: the tables the app relies on.
-- These were originally created in the Supabase dashboard; this file lets a new
-- project be set up from the repo. Every statement is "if not exists", so running
-- it on an existing project changes nothing that is already there.
-- Run in the Supabase SQL Editor, before the later migrations.
-- ============================================================

-- ── profiles: one row per auth user (filled by the trigger in the next migration) ──
create table if not exists public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ── user_subscriptions: plan + Stripe state, written only by the Stripe webhook ──
create table if not exists public.user_subscriptions (
  user_id                uuid        primary key references auth.users (id) on delete cascade,
  plan                   text        not null default 'free',
  status                 text,
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

-- ── export_usage: signed-in users' export count per month ("YYYY-MM", UTC) ──
create table if not exists public.export_usage (
  user_id      uuid    not null references auth.users (id) on delete cascade,
  month_key    text    not null,
  exports_used integer not null default 0,
  primary key (user_id, month_key)
);
-- consume_exports() relies on this pair being unique (a no-op if the primary key above exists).
create unique index if not exists export_usage_user_month_key on public.export_usage (user_id, month_key);

-- ── Row level security ──
-- The browser may read its own profile and subscription; all writes go through the
-- server's service role, which bypasses RLS. export_usage has no client access at all.
alter table public.profiles           enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.export_usage       enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_own') then
    create policy profiles_select_own on public.profiles for select to authenticated using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_subscriptions' and policyname = 'user_subscriptions_select_own') then
    create policy user_subscriptions_select_own on public.user_subscriptions for select to authenticated using (auth.uid() = user_id);
  end if;
end
$$;
