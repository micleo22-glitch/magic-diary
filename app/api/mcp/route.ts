import { NextRequest, NextResponse } from 'next/server'
import { createUserClient } from '@/lib/supabase-admin'
import { xai } from '@ai-sdk/xai'
import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'

// ── MCP server for Magic Diary ────────────────────────────────────────────────
// Implements JSON-RPC 2.0 over HTTP (Streamable HTTP transport)
// Compatible with MCP clients that support HTTP POST transport

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
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
    description: 'Wysyła wiadomość do nauczyciela AI (Severus Snape) — odpowiedź ucznia na pytanie nauczyciela lub nową refleksję. Nauczyciel analizuje dziennik i odpowiada w charakterystycznym stylu.',
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

GŁOS: teatralne pauzy, chłodna ironia, metafory alchemiczne. Kończ zawsze chirurgicznym pytaniem. 2–4 zdania. Wyłącznie po polsku.`

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
        get_diary_entries: tool({
          description: 'Pobierz starsze wpisy z dziennika.',
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
            query = query.limit(Math.min(typeof limit === 'number' ? limit : 5, 10))
            const { data, error } = await query
            if (error || !data?.length) return 'Brak wpisów.'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return JSON.stringify(data.map((r: any) => ({
              data: r.date, tytuł: r.title || '(bez tytułu)',
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

    const toolResult = await handleToolCall(name, args as Record<string, unknown>, token)

    if ('error' in toolResult) {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: toolResult.error.message }],
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
