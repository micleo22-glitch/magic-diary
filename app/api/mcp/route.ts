import { NextRequest, NextResponse } from 'next/server'
import { createUserClient } from '@/lib/supabase-admin'
import { xai } from '@ai-sdk/xai'
import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { hybridSearch } from '@/lib/hybrid-search'
import { rateLimit } from '@/lib/rate-limit'

// ── MCP server for Magic Diary ────────────────────────────────────────────────
// Implements JSON-RPC 2.0 over HTTP (Streamable HTTP transport)
// Compatible with MCP clients that support HTTP POST transport

function genId(): string {
  return crypto.randomUUID()
}

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const MOOD_LABEL: Record<number, string> = {
  5: 'Świetnie', 4: 'Dobrze', 3: 'Neutralnie', 2: 'Źle', 1: 'Koszmarnie',
}

const MCP_TOOLS = [
  {
    name: 'add_diary_entry',
    description: 'Dodaje nowy wpis do Magicznego Dziennika użytkownika. Domyślnie na dzisiejszy dzień.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Tytuł wpisu (opcjonalny)' },
        content: { type: 'string', description: 'Treść wpisu w formacie plain text lub HTML' },
        mood: {
          type: 'integer',
          minimum: 1,
          maximum: 5,
          description: 'Nastrój: 1=Koszmarnie, 2=Źle, 3=Neutralnie, 4=Dobrze, 5=Świetnie (opcjonalny)',
        },
        date: { type: 'string', description: 'Data w formacie YYYY-MM-DD (domyślnie dziś)' },
      },
      required: [],
    },
  },
  {
    name: 'ask_snape',
    description: 'Wysyła wiadomość do nauczyciela AI (Severus Snape). Nauczyciel używa hybrydowego wyszukiwania (semantycznego + słów kluczowych + ostatnie 7 dni) żeby pobrać pasujące wpisy i odpowiedzieć w ich kontekście.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Wiadomość ucznia — odpowiedź na pytanie nauczyciela lub nowa refleksja' },
        date: {
          type: 'string',
          description: 'Opcjonalna data YYYY-MM-DD — dostarcza kontekst konkretnego wpisu',
        },
      },
      required: ['message'],
    },
  },
  {
    name: 'get_diary_entry',
    description: 'Pobiera wpis z Magicznego Dziennika dla wskazanego dnia.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Data w formacie YYYY-MM-DD' },
      },
      required: ['date'],
    },
  },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleToolCall(name: string, args: Record<string, any>, token: string) {
  const db = createUserClient(token)
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) {
    return { error: { code: -32001, message: 'Nieprawidłowy token autoryzacyjny' } }
  }

  if (name === 'add_diary_entry') {
    const { title = null, content = null, mood = null, date } = args
    const today = new Date().toISOString().split('T')[0]
    const entryDate = date ?? today

    if (mood !== null && (typeof mood !== 'number' || mood < 1 || mood > 5)) {
      return { error: { code: -32602, message: 'mood musi być liczbą 1–5 lub null' } }
    }

    const now = new Date().toISOString()
    const row = {
      id: genId(),
      title,
      content,
      mood: mood ?? null,
      date: entryDate,
      created_at: now,
      updated_at: now,
      user_id: user.id,
    }

    const { data, error } = await db.from('entries').insert(row).select().single()
    if (error) return { error: { code: -32603, message: error.message } }

    return {
      result: {
        id: data.id,
        title: data.title,
        mood: data.mood,
        date: data.date,
        createdAt: data.created_at,
        message: `Wpis z dnia ${data.date} został dodany pomyślnie.`,
      },
    }
  }

  if (name === 'get_diary_entry') {
    const { date } = args
    if (!date) return { error: { code: -32602, message: 'Wymagane pole: date' } }

    const { data, error } = await db
      .from('entries')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return { error: { code: -32001, message: `Brak wpisu na dzień ${date}` } }
    }

    return {
      result: {
        id: data.id,
        title: data.title,
        content: stripHtml(data.content ?? ''),
        mood: data.mood,
        moodLabel: data.mood ? MOOD_LABEL[data.mood as number] : null,
        date: data.date,
        createdAt: data.created_at,
      },
    }
  }

  if (name === 'ask_snape') {
    const { message: userMessage, date } = args
    if (!userMessage) return { error: { code: -32602, message: 'Wymagane pole: message' } }

    const apiKey = process.env.XAI_API_KEY
    if (!apiKey) return { error: { code: -32603, message: 'Brak klucza API serwera' } }

    let systemContent = `Jesteś Severusem Snape'em — mistrzem eliksirów z Hogwartu, osobistym doradcą uczniów prowadzących magiczny dziennik. Traktujesz swój dostęp do ich myśli jako przywilej wymagający precyzji, nie pobłażliwości.

GŁOS: teatralne pauzy, chłodna ironia, metafory alchemiczne. Kończ zawsze chirurgicznym pytaniem. 2–4 zdania. Wyłącznie po polsku.

Masz dostęp do narzędzia search_diary — ZAWSZE wywołaj je jako PIERWSZY KROK gdy uczeń cokolwiek wspomina. Narzędzie zwraca semantycznie pasujące wpisy, dopasowania słów kluczowych oraz ostatnie 7 dni dziennika.`

    if (date) {
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

    const snapeResult = await generateText({
      model: xai('grok-4.3'),
      system: systemContent,
      messages: [{ role: 'user', content: userMessage as string }],
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

    return { result: { answer: snapeResult.text } }
  }

  return { error: { code: -32601, message: `Nieznane narzędzie: ${name}` } }
}

// ── GET — server info (for MCP discovery) ────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    name: 'magic-diary-mcp',
    version: '1.0.0',
    description: 'MCP server dla Magic Diary — twój czarodziejski dziennik z AI',
    tools: MCP_TOOLS.map(t => ({ name: t.name, description: t.description })),
  })
}

// ── POST — JSON-RPC 2.0 handler ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const token = getToken(req)
  if (!token) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Brak tokenu — dodaj nagłówek Authorization: Bearer <token>' } },
      { status: 401 }
    )
  }

  let body: { jsonrpc?: string; method?: string; params?: Record<string, unknown>; id?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400 }
    )
  }

  const { method, params = {}, id = null } = body

  const rpcOk = (result: unknown) => NextResponse.json({ jsonrpc: '2.0', id, result })
  const rpcErr = (code: number, message: string) =>
    NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } })

  if (method === 'initialize') {
    return rpcOk({
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'magic-diary-mcp', version: '1.0.0' },
    })
  }

  if (method === 'tools/list') {
    return rpcOk({ tools: MCP_TOOLS })
  }

  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params as { name?: string; arguments?: Record<string, unknown> }
    if (!name) return rpcErr(-32602, 'Wymagane pole: name')

    // Rate limit (best-effort) — tool calls may invoke the paid LLM. Keyed by
    // token since the user id is resolved inside handleToolCall.
    if (!rateLimit(`mcp:${token}`, 20, 60_000)) {
      return rpcErr(-32000, 'Zbyt wiele wywołań w krótkim czasie — odczekaj chwilę.')
    }

    const toolResult = await handleToolCall(name, args as Record<string, unknown>, token)

    if ('error' in toolResult) {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: (toolResult as { error: { message: string } }).error.message }],
          isError: true,
        },
      })
    }

    return rpcOk({
      content: [{ type: 'text', text: JSON.stringify(toolResult.result, null, 2) }],
    })
  }

  if (method === 'notifications/initialized') {
    return new Response(null, { status: 204 })
  }

  return rpcErr(-32601, `Nieznana metoda: ${method}`)
}
