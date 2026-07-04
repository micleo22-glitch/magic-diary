# Magic Diary deployment checklist

This project uses:

- Next.js on Vercel for the app and API routes.
- Strapi on Railway as the source of truth for diary entries and entitlements.
- Supabase for Auth, Storage, RAG backup rows, vectors, and chat data.
- PostHog for analytics, session recordings, and heatmaps.

Keep real secrets in `.env.local`, Railway variables, Vercel Environment Variables,
and Supabase/PostHog dashboards. Do not commit real secret values.

## 1. Supabase

Create a Supabase project and apply the SQL files in `supabase/migrations`.

Required extensions and objects:

- `vector`
- `pg_trgm`
- `public.entries`
- `public.hybrid_search_entries`
- `public.entitlements`

Create a private Storage bucket:

- `entry-photos`

The app stores photo paths in Strapi and in the Supabase `entries.photos` array.
The actual image files live in Supabase Storage, so they survive app and Strapi
deployments.

Required app variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Security notes:

- `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- Never prefix service-role or Stripe secrets with `NEXT_PUBLIC_`.
- Keep RLS enabled on exposed Supabase tables.
- `entries` access is scoped to `auth.uid() = user_id`.

## 2. Railway Strapi

Deploy the repo to Railway. The root `railway.json` builds and starts the
`strapi` service.

Add a PostgreSQL database in Railway and set these variables on the Strapi
service:

```env
DATABASE_CLIENT=postgres
DATABASE_URL=${{postgres.DATABASE_URL}}
DATABASE_SSL=false
HOST=0.0.0.0
PORT=1337
APP_KEYS=
API_TOKEN_SALT=
ADMIN_JWT_SECRET=
TRANSFER_TOKEN_SALT=
JWT_SECRET=
STRAPI_SYNC_TOKEN=
NEXT_APP_URL=https://your-vercel-app.vercel.app
URL=https://your-strapi-service.up.railway.app
```

`STRAPI_SYNC_TOKEN` must be the same in Railway and Vercel.

Entries can be added from Strapi Admin. Every entry must include the Supabase
Auth `user_id` for the user who owns the diary entry. Photos should be an array
of Supabase Storage paths or stable URLs, not uploaded Strapi media files.

## 3. Vercel

Connect the GitHub repo to Vercel and add these Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
XAI_API_KEY=
STRAPI_URL=https://your-strapi-service.up.railway.app
STRAPI_SYNC_TOKEN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Optional local verification:

```bash
npm run build
```

Production deploy:

```bash
vercel --prod
```

## 4. PostHog

Create a PostHog EU project and copy the Project API Key into Vercel:

```env
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

In PostHog project settings, enable:

- Session recordings
- Heatmaps

The app already initializes PostHog in `app/providers.tsx`.

## 5. RAG and embeddings

Strapi is the content source of truth. Supabase keeps a technical copy of entry
data for RAG, hybrid search, and embeddings.

Data flow:

1. The app creates or updates an entry through `/api/cms/entries`.
2. Next.js writes to Strapi.
3. Next.js mirrors the entry into Supabase `entries`.
4. Embeddings are generated and stored in Supabase.
5. When an entry is edited directly in Strapi, Strapi lifecycle hooks call
   `/api/cms/strapi-webhook`, which updates the Supabase copy.

For backfilling local/test data:

```bash
npm run seed:hybrid-search
```

Use these variables locally when seeding:

```env
SEED_USER_ID=
SEED_ENTRIES_COUNT=350
SEED_BATCH_SIZE=50
SEED_RUN_ID=default
```

## 6. Quick security audit

Before production:

- Confirm `.env.local` and `.env.local.*` are not tracked by git.
- Confirm all production secrets are set in Vercel/Railway dashboards only.
- Rotate any key that was ever pasted into source control or chat.
- Confirm Strapi sync endpoints require `STRAPI_SYNC_TOKEN`.
- Confirm Supabase Storage bucket policies match the intended privacy model.
- Confirm PostHog CSP hosts are allowed in `next.config.js`.
- Run `npm run build`.
- Run `npm audit` and review any high or critical findings.
