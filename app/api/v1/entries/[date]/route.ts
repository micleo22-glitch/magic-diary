import { NextRequest, NextResponse } from 'next/server'
import { createUserClient } from '@/lib/supabase-admin'
import { isValidDate } from '@/lib/validate'
import { rateLimit } from '@/lib/rate-limit'

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

export async function GET(
  req: NextRequest,
  { params }: { params: { date: string } }
) {
  const token = getToken(req)
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized — podaj Bearer token w nagłówku Authorization' }, { status: 401 })
  }

  const db = createUserClient(token)
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Nieprawidłowy token' }, { status: 401 })
  }

  // Rate limit (best-effort, per user) — read endpoint, more generous window.
  if (!rateLimit(`entries-read:${user.id}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Zbyt wiele zapytań w krótkim czasie — odczekaj chwilę.' }, { status: 429 })
  }

  if (!isValidDate(params.date)) {
    return NextResponse.json({ error: 'date musi być w formacie YYYY-MM-DD' }, { status: 400 })
  }

  const { data, error } = await db
    .from('entries')
    .select('*')
    .eq('date', params.date)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Brak wpisu na ten dzień' }, { status: 404 })
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
  })
}
