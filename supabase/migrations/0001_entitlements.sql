-- Tydzień 4 — sklep z agentami.
-- `entitlements` = źródło prawdy "kto którego płatnego nauczyciela posiada".
-- Pisze WYŁĄCZNIE webhook Stripe (kluczem service-role, który omija RLS).
-- User może tylko CZYTAĆ swoje wiersze — celowo BRAK polityki INSERT/UPDATE/DELETE
-- dla zalogowanych, żeby nikt nie odblokował sobie agenta bez płatności.

create table if not exists public.entitlements (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  agent_id          text not null,
  source            text not null default 'stripe',  -- 'stripe' | 'manual' | 'comp'
  stripe_session_id text,                              -- audyt / idempotencja
  created_at        timestamptz not null default now(),
  unique (user_id, agent_id)
);

create index if not exists entitlements_user_id_idx on public.entitlements (user_id);

alter table public.entitlements enable row level security;

-- Tylko odczyt własnych wierszy.
drop policy if exists "read own entitlements" on public.entitlements;
create policy "read own entitlements"
  on public.entitlements
  for select
  using (auth.uid() = user_id);

-- Brak polityk INSERT/UPDATE/DELETE → zapis możliwy tylko przez service-role.
