-- ============================================================
-- Atomic export quota + Stripe webhook idempotency
-- Safe to run more than once. Run in the Supabase SQL Editor.
-- ============================================================

-- ── 1. consume_exports: check-and-increment in one statement ──
-- Concurrent exports can no longer both pass the monthly limit check.
create or replace function public.consume_exports(
  p_user_id   uuid,
  p_month_key text,
  p_amount    integer,
  p_limit     integer
)
returns table (ok boolean, exports_used integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
begin
  insert into public.export_usage (user_id, month_key, exports_used)
  values (p_user_id, p_month_key, 0)
  on conflict (user_id, month_key) do nothing;

  update public.export_usage eu
     set exports_used = eu.exports_used + p_amount
   where eu.user_id = p_user_id
     and eu.month_key = p_month_key
     and eu.exports_used + p_amount <= p_limit
  returning eu.exports_used into v_used;

  if found then
    return query select true, v_used;
  else
    return query
      select false, eu.exports_used
        from public.export_usage eu
       where eu.user_id = p_user_id
         and eu.month_key = p_month_key;
  end if;
end;
$$;

-- Only the server (service role) may call it.
revoke all on function public.consume_exports(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_exports(uuid, text, integer, integer) to service_role;

-- ── 2. stripe_events: remember processed webhook deliveries ──
create table if not exists public.stripe_events (
  id           text        primary key,  -- Stripe event id (evt_...)
  type         text        not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
-- No policies: only the service role (which bypasses RLS) touches this table.

-- ── 3. tool_events: no direct inserts with the public anon key ──
-- The app writes events through /api/events/track (service role, rate limited).
-- This policy let anyone with the public key insert rows directly.
drop policy if exists "insert for all" on public.tool_events;
