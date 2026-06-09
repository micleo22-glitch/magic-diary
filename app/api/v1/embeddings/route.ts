import { NextRequest, NextResponse } from 'next/server'
import { createUserClient } from '@/lib/supabase-admin'
import { generateEmbedding, entryToText } from '@/lib/embeddings'

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

// POST /api/v1/embeddings
// Backfill: generates embeddings for all entries that don't have one yet.
// Pass { id } in body to embed a single entry.
export async function POST(req: NextRequest) {
  const token = getToken(req)
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized — podaj Bearer token' }, { status: 401 })
  }

  const db = createUserClient(token)
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Nieprawidłowy token' }, { status: 401 })
  }

  let body: { id?: string } = {}
  try { body = await req.json() } catch { /* no body — full backfill */ }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = db.from('entries').select('id, title, content')
  if (body.id) {
    query = query.eq('id', body.id)
  } else {
    query = query.is('embedding', null)
  }

  const { data: entries, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!entries?.length) {
    return NextResponse.json({ updated: 0, message: 'Brak wpisów do przetworzenia' })
  }

  let updated = 0
  const failed: string[] = []

  for (const entry of entries) {
    const text = entryToText(entry.title, entry.content)
    if (!text) continue

    const embedding = await generateEmbedding(text)
    if (!embedding) { failed.push(entry.id); continue }

    const { error: upErr } = await db
      .from('entries')
      .update({ embedding })
      .eq('id', entry.id)

    if (upErr) { failed.push(entry.id) } else { updated++ }
  }

  return NextResponse.json({
    total: entries.length,
    updated,
    failed: failed.length,
    ...(failed.length ? { failedIds: failed } : {}),
  })
}
