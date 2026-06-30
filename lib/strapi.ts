import { Entry } from '@/types/entry'

type StrapiApiEntry = Entry & {
  documentId?: string
  user_id?: string
}

function getStrapiConfig(): { url: string; token: string } | null {
  const url = process.env.STRAPI_URL?.replace(/\/$/, '')
  const token = process.env.STRAPI_SYNC_TOKEN
  if (!url || !token) return null
  return { url, token }
}

async function strapiFetch(path: string, init?: RequestInit) {
  const config = getStrapiConfig()
  if (!config) return null

  const res = await fetch(`${config.url}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText)
    throw new Error(`Strapi ${res.status}: ${message}`)
  }

  if (res.status === 204) return null
  return res.json()
}

function toEntry(entry: StrapiApiEntry): Entry {
  return {
    id: entry.id,
    title: entry.title ?? '',
    content: entry.content ?? '',
    mood: entry.mood ?? null,
    date: entry.date,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    photos: entry.photos ?? [],
  }
}

export async function getStrapiEntries(userId: string): Promise<Entry[]> {
  const data = await strapiFetch(`/api/magic-diary/entries?user_id=${encodeURIComponent(userId)}`)
  return (data?.data ?? []).map(toEntry)
}

export async function getStrapiEntry(userId: string, id: string): Promise<Entry | null> {
  const params = new URLSearchParams({ user_id: userId, entry_id: id })
  const data = await strapiFetch(`/api/magic-diary/entries?${params.toString()}`)
  const entry = data?.data?.[0]
  return entry ? toEntry(entry) : null
}

export async function upsertStrapiEntry(entry: Entry, userId: string): Promise<Entry | null> {
  const data = await strapiFetch('/api/magic-diary/entries', {
    method: 'POST',
    body: JSON.stringify({
      action: 'upsert',
      entry: {
        title: entry.title || null,
        content: entry.content || null,
        mood: entry.mood,
        date: entry.date,
        photos: entry.photos ?? [],
        user_id: userId,
        app_entry_id: entry.id,
        supabase_id: entry.id,
      },
    }),
  })
  return data?.entry ? toEntry(data.entry) : null
}

export async function deleteStrapiEntry(supabaseId: string): Promise<void> {
  await strapiFetch('/api/magic-diary/entries', {
    method: 'POST',
    body: JSON.stringify({
      action: 'delete',
      entry: {
        app_entry_id: supabaseId,
        supabase_id: supabaseId,
      },
    }),
  })
}
