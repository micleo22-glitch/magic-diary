import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const strapiUrl = process.env.STRAPI_URL?.replace(/\/$/, '')
const syncToken = process.env.STRAPI_SYNC_TOKEN

if (!supabaseUrl || !serviceKey || !strapiUrl || !syncToken) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRAPI_URL or STRAPI_SYNC_TOKEN')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function syncEntry(row) {
  const res = await fetch(`${strapiUrl}/api/magic-diary/entries`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${syncToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'upsert',
      entry: {
        app_entry_id: row.id,
        supabase_id: row.id,
        title: row.title ?? '',
        content: row.content ?? '',
        mood: row.mood ?? null,
        date: row.date,
        photos: row.photos ?? [],
        user_id: row.user_id,
      },
    }),
  })

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText)
    throw new Error(`Strapi ${res.status}: ${message}`)
  }
}

let from = 0
const pageSize = 100
let total = 0
let failed = 0

for (;;) {
  const { data, error } = await supabase
    .from('entries')
    .select('id,title,content,mood,date,photos,user_id')
    .order('created_at', { ascending: true })
    .range(from, from + pageSize - 1)

  if (error) throw error
  if (!data?.length) break

  for (const row of data) {
    if (!row.user_id) {
      console.warn(`Skipping ${row.id}: missing user_id`)
      failed++
      continue
    }
    try {
      await syncEntry(row)
      total++
    } catch (error) {
      failed++
      console.error(`Failed ${row.id}: ${error.message}`)
    }
  }

  if (data.length < pageSize) break
  from += pageSize
}

console.log(JSON.stringify({ synced: total, failed }, null, 2))
