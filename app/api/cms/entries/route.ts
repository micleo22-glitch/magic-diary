import { NextRequest, NextResponse } from 'next/server'
import { createUserClient } from '@/lib/supabase-admin'
import { deleteStrapiEntry, getStrapiEntries, getStrapiEntry, upsertStrapiEntry } from '@/lib/strapi'
import { Entry } from '@/types/entry'
import { generateEmbedding, entryToText } from '@/lib/embeddings'

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

function rowToEntry(row: any): Entry {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    mood: row.mood,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photos: row.photos ?? [],
  }
}

function getAuth(req: NextRequest): string | null {
  return getToken(req)
}

async function getUserDb(req: NextRequest) {
  const token = getToken(req)
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const db = createUserClient(token)
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) }
  }

  return { db, user, token }
}

async function upsertSupabaseBackup(db: ReturnType<typeof createUserClient>, entry: Entry, userId: string) {
  const row = {
    id: entry.id,
    title: entry.title ?? '',
    content: entry.content ?? '',
    mood: entry.mood ?? null,
    date: entry.date,
    photos: entry.photos ?? [],
    user_id: userId,
    updated_at: entry.updatedAt ?? new Date().toISOString(),
  }

  const { error } = await db.from('entries').upsert(row, { onConflict: 'id' })
  if (error) throw error

  const text = entryToText(entry.title, entry.content)
  if (text) {
    generateEmbedding(text).then(embedding => {
      if (embedding) db.from('entries').update({ embedding }).eq('id', entry.id)
    }).catch(() => {})
  }
}

export async function GET(req: NextRequest) {
  const auth = await getUserDb(req)
  if (auth.error) return auth.error

  const entries = await getStrapiEntries(auth.user.id)
  return NextResponse.json({ entries })
}

export async function POST(req: NextRequest) {
  const auth = await getUserDb(req)
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null) as Partial<Entry> | null
  if (!body?.date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const entry: Entry = {
    id: body.id ?? crypto.randomUUID(),
    title: body.title ?? '',
    content: body.content ?? '',
    mood: body.mood ?? null,
    date: body.date,
    photos: body.photos ?? [],
    createdAt: body.createdAt ?? now,
    updatedAt: now,
  }

  const saved = await upsertStrapiEntry(entry, auth.user.id)
  const result = saved ?? entry
  await upsertSupabaseBackup(auth.db, result, auth.user.id)
  return NextResponse.json({ entry: result }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const auth = await getUserDb(req)
  if (auth.error) return auth.error

  const body = await req.json().catch(() => null) as Partial<Entry> & { id?: string } | null
  if (!body?.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const existing = await getStrapiEntry(auth.user.id, body.id)
  if (!existing) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  const next: Entry = {
    ...existing,
    title: body.title ?? existing.title,
    content: body.content ?? existing.content,
    mood: body.mood !== undefined ? body.mood : existing.mood,
    date: body.date ?? existing.date,
    photos: body.photos ?? existing.photos,
    updatedAt: new Date().toISOString(),
  }

  const saved = await upsertStrapiEntry(next, auth.user.id)
  const result = saved ?? next
  await upsertSupabaseBackup(auth.db, result, auth.user.id)
  return NextResponse.json({ entry: result })
}

export async function DELETE(req: NextRequest) {
  const auth = await getUserDb(req)
  if (auth.error) return auth.error

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const existing = await getStrapiEntry(auth.user.id, id)
  if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  await deleteStrapiEntry(id)
  await auth.db.from('entries').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
