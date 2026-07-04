create extension if not exists vector with schema public;
create extension if not exists pg_trgm with schema public;

create table if not exists public.entries (
  id         text primary key,
  title      text default '',
  content    text default '',
  mood       smallint check (mood >= 1 and mood <= 5),
  date       date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  embedding  vector(1536),
  photos     text[] default '{}'::text[],
  strapi_id  text
);

create index if not exists entries_user_date_idx
  on public.entries (user_id, date desc);

create index if not exists entries_strapi_id_idx
  on public.entries (strapi_id);

create index if not exists entries_embedding_hnsw_idx
  on public.entries using hnsw (embedding vector_cosine_ops);

create index if not exists entries_title_content_trgm_idx
  on public.entries
  using gin (lower(coalesce(title, '') || ' ' || coalesce(content, '')) gin_trgm_ops);

alter table public.entries enable row level security;

drop policy if exists select_own on public.entries;
create policy select_own
  on public.entries
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists insert_own on public.entries;
create policy insert_own
  on public.entries
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists update_own on public.entries;
create policy update_own
  on public.entries
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists delete_own on public.entries;
create policy delete_own
  on public.entries
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.entries from anon;
grant select, insert, update, delete on table public.entries to authenticated;
grant all on table public.entries to service_role;

create or replace function public.hybrid_search_entries(
  query_embedding vector(1536),
  query_text text,
  match_count integer default 30
)
returns table (
  id text,
  title text,
  content text,
  mood smallint,
  date date,
  sim double precision
)
language sql
stable
security invoker
set search_path = public
as $function$
  with params as (
    select
      greatest(1, least(coalesce(match_count, 30), 100)) as limit_count,
      nullif(btrim(coalesce(query_text, '')), '') as clean_query,
      (select auth.uid()) as current_user_id
  ),
  vector_results as (
    select
      e.id,
      e.title,
      e.content,
      e.mood,
      e.date,
      (1 - (e.embedding <=> query_embedding))::double precision as sim
    from public.entries e
    cross join params p
    where e.user_id = p.current_user_id
      and e.embedding is not null
      and query_embedding is not null
    order by e.embedding <=> query_embedding
    limit (select limit_count from params)
  ),
  keyword_results as (
    select
      e.id,
      e.title,
      e.content,
      e.mood,
      e.date,
      greatest(
        similarity(lower(coalesce(e.title, '')), lower(p.clean_query)),
        similarity(lower(coalesce(e.content, '')), lower(p.clean_query)),
        similarity(
          lower(coalesce(e.title, '') || ' ' || coalesce(e.content, '')),
          lower(p.clean_query)
        )
      )::double precision as sim
    from public.entries e
    cross join params p
    where e.user_id = p.current_user_id
      and p.clean_query is not null
      and (
        lower(coalesce(e.title, '') || ' ' || coalesce(e.content, '')) like '%' || lower(p.clean_query) || '%'
        or lower(coalesce(e.title, '') || ' ' || coalesce(e.content, '')) % lower(p.clean_query)
      )
    order by sim desc, e.date desc
    limit (select limit_count from params)
  ),
  recent_results as (
    select
      e.id,
      e.title,
      e.content,
      e.mood,
      e.date,
      0.05::double precision as sim
    from public.entries e
    cross join params p
    where e.user_id = p.current_user_id
      and e.date >= current_date - interval '7 days'
      and e.date <= current_date
    order by e.date desc, e.created_at desc
    limit (select limit_count from params)
  ),
  combined as (
    select * from vector_results
    union all
    select * from keyword_results
    union all
    select * from recent_results
  ),
  ranked as (
    select
      combined.*,
      row_number() over (partition by combined.id order by combined.sim desc, combined.date desc) as rn
    from combined
  )
  select ranked.id, ranked.title, ranked.content, ranked.mood, ranked.date, ranked.sim
  from ranked
  where ranked.rn = 1
  order by ranked.sim desc, ranked.date desc
  limit (select limit_count from params);
$function$;

revoke all on function public.hybrid_search_entries(vector(1536), text, integer) from public;
grant execute on function public.hybrid_search_entries(vector(1536), text, integer) to authenticated;
grant execute on function public.hybrid_search_entries(vector(1536), text, integer) to service_role;
