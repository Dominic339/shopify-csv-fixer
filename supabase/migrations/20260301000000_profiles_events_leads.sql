-- ============================================================
-- Schema updates: profiles enrichment + analytics events
-- Run in Supabase SQL Editor
-- ============================================================

-- ── 1. Enrich profiles table ─────────────────────────────────
alter table public.profiles
  add column if not exists email text,
  add column if not exists last_seen_at timestamptz;

-- ── 2. Trigger: auto-populate profiles on new sign-up ────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, created_at, last_seen_at)
  values (
    new.id,
    new.email,
    now(),
    now()
  )
  on conflict (id) do update
    set email        = excluded.email,
        last_seen_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 3. Backfill existing auth users into profiles ────────────
insert into public.profiles (id, email, created_at, last_seen_at)
select
  u.id,
  u.email,
  u.created_at,
  coalesce(u.last_sign_in_at, u.created_at) as last_seen_at
from auth.users u
on conflict (id) do update
  set email        = excluded.email,
      last_seen_at = excluded.last_seen_at;

-- ── 4. Create tool_events analytics table ────────────────────
create table if not exists public.tool_events (
  id           bigserial primary key,
  event_name   text        not null,
  user_id      uuid        references auth.users(id) on delete set null,
  session_key  text,
  plan         text        default 'free',
  metadata     jsonb       default '{}'::jsonb,
  created_at   timestamptz default now()
);

-- Index for querying by event or user
create index if not exists tool_events_event_name_idx on public.tool_events(event_name);
create index if not exists tool_events_user_id_idx    on public.tool_events(user_id);
create index if not exists tool_events_created_at_idx on public.tool_events(created_at desc);

-- Allow the service role (used by API routes) to insert
alter table public.tool_events enable row level security;

create policy "service role full access" on public.tool_events
  as permissive for all
  to service_role
  using (true)
  with check (true);

-- Allow anon/authenticated to insert (we validate on the API side)
create policy "insert for all" on public.tool_events
  as permissive for insert
  to anon, authenticated
  with check (true);

-- ── 5. Create lead_emails table for quota wall email capture ──
create table if not exists public.lead_emails (
  id         bigserial primary key,
  email      text        not null unique,
  source     text        default 'quota_wall',
  created_at timestamptz default now()
);

create index if not exists lead_emails_email_idx on public.lead_emails(email);

alter table public.lead_emails enable row level security;

create policy "service role full access" on public.lead_emails
  as permissive for all
  to service_role
  using (true)
  with check (true);
