import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-admin'
import { generateEmbedding, entryToText } from '@/lib/embeddings'

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

function assertWebhookToken(req: NextRequest): boolean {
  const expected = process.env.STRAPI_SYNC_TOKEN
  const token = getToken(req)
  return Boolean(expected && token && token === expected)
}

function toSupabaseRow(entry: Record<string, any>) {
  const id = entry.app_entry_id ?? entry.supabase_id
  if (!id) throw new Error('Missing app_entry_id')
  if (!entry.user_id) throw new Error('Missing user_id')

  return {
    id,
    title: entry.title ?? '',
    content: entry.content ?? '',
    mood: entry.mood ?? null,
    date: entry.date,
    photos: Array.isArray(entry.photos) ? entry.photos : [],
    user_id: entry.user_id,
    strapi_id: entry.documentId ?? String(entry.id ?? ''),
    updated_at: entry.updatedAt ?? new Date().toISOString(),
  }
}

export async function POST(req: NextRequest) {
  if (!assertWebhookToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null) as {
    event?: string
    entry?: Record<string, any>
  } | null

  if (!body?.event || !body.entry) {
    return NextResponse.json({ error: 'event and entry are required' }, { status: 400 })
  }

  const db = createServiceClient()
  const row = toSupabaseRow(body.entry)

  if (body.event === 'entry.delete') {
    const { error } = await db.from('entries').delete().eq('id', row.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { error } = await db.from('entries').upsert(row, { onConflict: 'id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const text = entryToText(row.title, row.content)
  if (text) {
    generateEmbedding(text).then(embedding => {
      if (embedding) db.from('entries').update({ embedding }).eq('id', row.id)
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
