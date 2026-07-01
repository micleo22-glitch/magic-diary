-- Tydzień 4 — sklep z agentami.
-- `entitlements` = cache/RLS mirror dla Strapi, które jest źródłem prawdy.
-- Pisze backend Next (kluczem service-role, który omija RLS) po zmianach ze Strapi/Stripe.
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
