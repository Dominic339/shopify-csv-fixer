-- 24-hour export passes (one-time Stripe payments).
--
-- One row per paid Checkout Session. A pass bought while another is still
-- active starts when the earlier one ends, so buying twice gives 48 hours.
-- Rows are written only by the Stripe webhook (service role); signed-in users
-- can read their own.

create table if not exists public.export_passes (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users (id) on delete cascade,
  stripe_session_id text        not null unique,
  starts_at         timestamptz not null,
  expires_at        timestamptz not null,
  created_at        timestamptz not null default now()
);

create index if not exists export_passes_user_expires_idx
  on public.export_passes (user_id, expires_at desc);

alter table public.export_passes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'export_passes' and policyname = 'export_passes_select_own') then
    create policy export_passes_select_own on public.export_passes for select to authenticated using (auth.uid() = user_id);
  end if;
end $$;
