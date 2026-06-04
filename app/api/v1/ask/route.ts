import { NextRequest, NextResponse } from 'next/server'
import { createUserClient } from '@/lib/supabase-admin'
import { xai } from '@ai-sdk/xai'
import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const MOOD_LABEL: Record<number, string> = {
  5: 'Świetnie', 4: 'Dobrze', 3: 'Neutralnie', 2: 'Źle', 1: 'Koszmarnie',
}

const SNAPE_SYSTEM = `Jesteś Severusem Snape'em — mistrzem eliksirów z Hogwartu, osobistym doradcą uczniów prowadzących magiczny dziennik. Masz dostęp do ich najintymniejszych myśli i traktujesz to jako przywilej wymagający precyzji, nie pobłażliwości.

GŁOS I STYL — teatralne pauzy, chłodna ironia, metafory alchemiczne (destylować, retorta, składnik, osad).
Otwierasz odpowiedź ironicznym echem lub chłodną obserwacją. Nigdy: "Rozumiem", "To ważne", "Świetnie".
Kończysz zawsze celnym pytaniem chirurgicznym.
2–4 zdania maksimum. Wyłącznie po polsku.

Masz dostęp do narzędzia get_diary_entries — używaj gdy uczeń nawiązuje do przeszłości.`

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

  const body = await req.json()
  const { message, date } = body as { message: string; date?: string }

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'Wymagane pole: message (string) — odpowiedź ucznia na pytanie nauczyciela' }, { status: 400 })
  }

  let systemContent = SNAPE_SYSTEM

  // If date provided, load that entry as context
  if (date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      return NextResponse.json({ error: 'date musi być w formacie YYYY-MM-DD' }, { status: 400 })
    }

    const { data: entry } = await db
      .from('entries')
      .select('*')
      .eq('date', date)
      .limit(1)
      .single()

    if (entry) {
      const contentText = stripHtml(entry.content ?? '').slice(0, 2000)
      const moodText = entry.mood ? MOOD_LABEL[entry.mood as number] : null
      systemContent +=
        `\n\n---\nKontekst — wpis z dnia ${entry.date}:\nTytuł: "${entry.title || '(bez tytułu)'}"` +
        (moodText ? `\nNastrój: ${moodText}` : '') +
        (contentText ? `\nTreść:\n${contentText}` : '')
    }
  }

  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Brak klucza API serwera' }, { status: 500 })
  }

  const result = await generateText({
    model: xai('grok-4.3'),
    system: systemContent,
    messages: [{ role: 'user', content: message }],
    tools: {
      get_diary_entries: tool({
        description: 'Pobierz starsze wpisy z dziennika ucznia.',
        inputSchema: z.object({
          date_from: z.string().optional(),
          date_to: z.string().optional(),
          limit: z.number().int().optional(),
        }),
        execute: async ({ date_from, date_to, limit }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let query: any = db
            .from('entries')
            .select('date, title, mood, content')
            .order('date', { ascending: false })

          if (date_from) query = query.gte('date', date_from)
          if (date_to) query = query.lte('date', date_to)

          const safeLimit = Math.min(typeof limit === 'number' ? limit : 5, 10)
          query = query.limit(safeLimit)

          const { data, error } = await query
          if (error || !data?.length) return 'Brak wpisów.'

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return JSON.stringify(data.map((r: any) => ({
            data: r.date,
            tytuł: r.title || '(bez tytułu)',
            nastrój: r.mood ? MOOD_LABEL[r.mood as number] : null,
            treść: stripHtml(r.content ?? '').slice(0, 400),
          })))
        },
      }),
    },
    stopWhen: stepCountIs(3),
    maxTokens: 350,
    temperature: 0.85,
  })

  return NextResponse.json({ answer: result.text })
}
