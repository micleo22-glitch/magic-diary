# Magic Diary Strapi CMS

Strapi v5 service for Railway. Strapi is the source of truth for diary entry
content. Supabase remains responsible for auth, Storage photo files, embeddings,
chat data, and an entries backup table.

## Local development

```bash
cd strapi
npm install
copy .env.example .env
npm run develop
```

## Railway

Required variables:

- `DATABASE_CLIENT=postgres`
- `DATABASE_URL=${{postgres.DATABASE_URL}}`
- `DATABASE_SSL=false`
- `HOST=0.0.0.0`
- `PORT=1337`
- `APP_KEYS`
- `API_TOKEN_SALT`
- `ADMIN_JWT_SECRET`
- `TRANSFER_TOKEN_SALT`
- `JWT_SECRET`
- `STRAPI_SYNC_TOKEN`
- `NEXT_APP_URL`
- `URL`
