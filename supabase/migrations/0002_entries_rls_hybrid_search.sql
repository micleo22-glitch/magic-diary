create extension if not exists vector with schema public;
create extension if not exists pg_trgm with schema public;

create table if not exists public.entries (
  id         text primary key,
  title      text not null default '',
  content    text not null default '',
  mood       smallint check (mood >= 1 and mood <= 5),
  date       date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id    uuid references auth.users (id) on delete cascade,
  embedding  vector(1536),
  photos     text[] default '{}'::text[],
  strapi_id  text
);

create index if not exists entries_embedding_hnsw_idx
  on public.entries using hnsw (embedding vector_cosine_ops);

create index if not exists entries_strapi_id_idx
  on public.entries (strapi_id);

grant delete, insert, references, select, trigger, truncate, update
  on table public.entries to anon;

grant delete, insert, references, select, trigger, truncate, update
  on table public.entries to authenticated;

grant delete, insert, references, select, trigger, truncate, update
  on table public.entries to service_role;

alter table public.entries enable row level security;

drop policy if exists delete_own on public.entries;
create policy delete_own
  on public.entries
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists insert_own on public.entries;
create policy insert_own
  on public.entries
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists select_own on public.entries;
create policy select_own
  on public.entries
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists update_own on public.entries;
create policy update_own
  on public.entries
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.hybrid_search_entries(query_embedding vector, query_text text, match_count integer default 30)
returns table(id text, title text, content text, mood smallint, date date, sim double precision)
language sql
stable
set search_path to 'public'
as $function$
  with vector_results as (
    select e.id, e.title, e.content, e.mood, e.date,
           (1 - (e.embedding <=> query_embedding))::float as sim
    from entries e
    where e.embedding is not null
    order by e.embedding <=> query_embedding
    limit match_count
  ),
  keyword_results as (
    select e.id, e.title, e.content, e.mood, e.date,
           0.4::float as sim
    from entries e
    where lower(e.title || ' ' || coalesce(e.content,'')) like '%' || lower(query_text) || '%'
    limit match_count
  ),
  recent as (
    select e.id, e.title, e.content, e.mood, e.date,
           0.1::float as sim
    from entries e
    where e.date >= current_date - interval '7 days'
      and e.date <= current_date
    order by e.date desc
  ),
  combined as (
    select * from vector_results
    union all
    select * from keyword_results
    union all
    select * from recent
  ),
  deduped as (
    select distinct on (id) id, title, content, mood, date, sim
    from combined
    order by id, sim desc
  )
  select * from deduped
  order by sim desc;
$function$;
