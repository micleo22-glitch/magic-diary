import { NextRequest, NextResponse } from 'next/server'
import { createUserClient } from '@/lib/supabase-admin'
import { isValidDate } from '@/lib/validate'
import { xai } from '@ai-sdk/xai'
import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { hybridSearch } from '@/lib/hybrid-search'
import { rateLimit } from '@/lib/rate-limit'

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

Masz dostęp do narzędzia search_diary — ZAWSZE wywołaj je jako PIERWSZY KROK gdy uczeń cokolwiek wspomina. Narzędzie zwraca semantycznie pasujące wpisy, dopasowania słów kluczowych oraz ostatnie 7 dni dziennika.`

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

  // Rate limit (best-effort, per user) — guards the paid LLM against abuse.
  if (!rateLimit(`ask:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Zbyt wiele zapytań w krótkim czasie — odczekaj chwilę.' }, { status: 429 })
  }

  const body = await req.json()
  const { message, date } = body as { message: string; date?: string }

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'Wymagane pole: message (string) — odpowiedź ucznia na pytanie nauczyciela' }, { status: 400 })
  }

  let systemContent = SNAPE_SYSTEM

  // If date provided, load that entry as context
  if (date) {
    if (!isValidDate(date)) {
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
      search_diary: tool({
        description: 'Wyszukaj wpisy semantycznie, po słowach kluczowych i po dacie. Wynik zawiera ostatnie 7 dni. WYWOŁAJ JAKO PIERWSZY KROK gdy uczeń wspomina cokolwiek.',
        inputSchema: z.object({
          query: z.string().describe('Zapytanie — temat, osoba, emocja, wydarzenie'),
          date_from: z.string().optional().describe('Data od YYYY-MM-DD'),
          date_to: z.string().optional().describe('Data do YYYY-MM-DD'),
        }),
        execute: async ({ query }) => {
          const results = await hybridSearch(db, query)
          if (!results.length) return 'Brak pasujących wpisów.'
          return JSON.stringify(results)
        },
      }),
    },
    stopWhen: stepCountIs(3),
    maxOutputTokens: 350,
    temperature: 0.85,
  })

  return NextResponse.json({ answer: result.text })
}
