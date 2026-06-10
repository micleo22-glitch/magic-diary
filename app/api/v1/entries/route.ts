import { NextRequest, NextResponse } from 'next/server'
import { createUserClient } from '@/lib/supabase-admin'
import { isValidDate } from '@/lib/validate'
import { generateEmbedding, entryToText } from '@/lib/embeddings'

function genId(): string {
  return crypto.randomUUID()
}

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

export async function POST(req: NextRequest) {
  const token = getToken(req)
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized — podaj Bearer token w nagłówku Authorization' }, { status: 401 })
  }

  const db = createUserClient(token)
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Nieprawidłowy token' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // empty body is fine
  }

  const { title = '', content = '', mood = null, date, photos = [] } = body as {
    title?: string
    content?: string
    mood?: number | null
    date?: string
    photos?: string[]
  }

  const today = new Date().toISOString().split('T')[0]
  const entryDate = date ?? today

  if (mood !== null && (typeof mood !== 'number' || !Number.isInteger(mood) || mood < 1 || mood > 5)) {
    return NextResponse.json({ error: 'mood musi być liczbą całkowitą 1–5 lub null' }, { status: 400 })
  }

  if (!isValidDate(entryDate)) {
    return NextResponse.json({ error: 'date musi być w formacie YYYY-MM-DD' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const row = {
    id: genId(),
    title: title || null,
    content: content || null,
    mood: mood ?? null,
    date: entryDate,
    photos: Array.isArray(photos) ? photos.slice(0, 3) : [],
    created_at: now,
    updated_at: now,
    user_id: user.id,
  }

  const { data, error } = await db.from('entries').insert(row).select().single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Generate embedding in the background (don't block the response)
  const embText = entryToText(data.title, data.content)
  if (embText) {
    generateEmbedding(embText).then(embedding => {
      if (embedding) db.from('entries').update({ embedding }).eq('id', data.id)
    }).catch(() => {})
  }

  return NextResponse.json({
    id: data.id,
    title: data.title,
    content: data.content,
    mood: data.mood,
    date: data.date,
    photos: data.photos ?? [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }, { status: 201 })
}
