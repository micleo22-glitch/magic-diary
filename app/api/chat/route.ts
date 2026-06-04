import { NextRequest, NextResponse } from 'next/server'
import https from 'node:https'
import { createUserClient } from '@/lib/supabase-admin'

// ── HTML stripping ────────────────────────────────────────────────────────────
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
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const MOOD_LABEL: Record<number, string> = {
  5: 'Świetnie', 4: 'Dobrze', 3: 'Neutralnie', 2: 'Źle', 1: 'Koszmarnie',
}

// ── Teacher personas ──────────────────────────────────────────────────────────
const SNAPE_FEW_SHOT = `
Oto trzy przykłady tego, jak powinieneś odpowiadać na wpisy ucznia:

<przykład 1>
Uczeń: Dziś pisałem o tym, że w końcu powiedziałem szefowi co myślę o projekcie. Nie wiem czy dobrze zrobiłem.
Snape: Odwaga bez planu to lekkomyślność — lecz milczenie bez granic to tchórzostwo. Co spodziewałeś się usłyszeć w odpowiedzi, a czego się bałeś?
</przykład 1>

<przykład 2>
Uczeń: Wszyscy mówią, że powinienem być bardziej asertywny. Chyba mają rację.
Snape: "Chyba" — interesujące słowo. Nie wyraża przekonania, lecz zmęczenie oporem. Czy naprawdę w to wierzysz, czy chcesz już mieć to za sobą?
</przykład 2>

<przykład 3>
Uczeń: W maju pisałem o strachu przed zmianami. Teraz zmieniłem pracę i właściwie nie jest tak źle.
Snape: Strach robi z nami to, co cień z przedmiotem — wyolbrzymia. Zastanawia mnie jednak, dlaczego "nie jest tak źle" brzmi w twoich ustach jak osiągnięcie, a nie ulga.
</przykład 3>
`

const TEACHERS: Record<string, { name: string; system: string }> = {
  snape: {
    name: 'Severus Snape',
    system: `Jesteś Severusem Snape'em — mistrzem eliksirów z Hogwartu, teraz pełniącym rolę osobistego doradcy uczniów prowadzących magiczny dziennik.

Twój styl:
- Sarkazm i chłodna ironia, ale nigdy okrucieństwo bez celu
- Krótkie, celne odpowiedzi — bez pustosłowia
- Przebiegłe pytania, które skłaniają do głębszej refleksji
- Czasem nieoczekiwany błysk troski lub uznania, szybko maskowany
- Mówisz po polsku, elegancko, bez slangu

Twoim zadaniem jest pomóc uczniowi zrozumieć siebie — poprzez prowokujące pytania, spostrzegawcze obserwacje i bystrą analizę tego, co piszą w dzienniku. Nie rozdajesz pochwał zbyt łatwo. Ale kiedy uczeń pokaże prawdziwy wgląd w siebie, potrafisz to dostrzec.

Odpowiadaj zwięźle: 2–4 zdania to ideał. Nigdy nie wychodź z postaci.

Masz dostęp do narzędzia get_diary_entries, które pozwala ci przeglądać starsze wpisy ucznia, gdy jest to potrzebne do lepszego zrozumienia jego sytuacji lub gdy uczeń nawiązuje do przeszłości.
${SNAPE_FEW_SHOT}`,
  },
  // Przykład kolejnego nauczyciela — odkomentuj i dostosuj:
  // dumbledore: {
  //   name: 'Albus Dumbledore',
  //   system: `Jesteś Albusem Dumbledore'em...`,
  // },
}

const DEFAULT_TEACHER = 'snape'

// ── Tool definitions ──────────────────────────────────────────────────────────
const DIARY_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_diary_entries',
      description:
        'Pobierz starsze wpisy z dziennika ucznia. Używaj gdy uczeń nawiązuje do przeszłości, porównuje się z wcześniejszym sobą lub chcesz zobaczyć wzorce w jego wpisach.',
      parameters: {
        type: 'object',
        properties: {
          date_from: {
            type: 'string',
            description: 'Data początkowa w formacie YYYY-MM-DD (opcjonalna)',
          },
          date_to: {
            type: 'string',
            description: 'Data końcowa w formacie YYYY-MM-DD (opcjonalna)',
          },
          limit: {
            type: 'integer',
            description: 'Maksymalna liczba wpisów do pobrania (domyślnie 5, maksymalnie 10)',
          },
        },
      },
    },
  },
]

// ── Tool executor ─────────────────────────────────────────────────────────────
async function executeTool(
  name: string,
  args: Record<string, unknown>,
  accessToken: string,
): Promise<string> {
  if (name === 'get_diary_entries') {
    const db = createUserClient(accessToken)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = db
      .from('entries')
      .select('date, title, mood, content')
      .order('date', { ascending: false })

    if (args.date_from) query = query.gte('date', args.date_from as string)
    if (args.date_to) query = query.lte('date', args.date_to as string)

    const limit = Math.min(typeof args.limit === 'number' ? args.limit : 5, 10)
    query = query.limit(limit)

    const { data, error } = await query
    if (error || !data?.length) return 'Brak wpisów spełniających kryteria.'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return JSON.stringify(data.map((r: any) => ({
      data: r.date,
      tytuł: r.title || '(bez tytułu)',
      nastrój: r.mood ? MOOD_LABEL[r.mood as number] : null,
      treść: stripHtml(r.content ?? '').slice(0, 400),
    })))
  }
  return 'Nieznane narzędzie.'
}

// ── HTTPS wrapper (handles SSL cert on Windows dev) ───────────────────────────
function makeAgent() {
  if (process.env.NODE_ENV !== 'development') return undefined
  return new https.Agent({ rejectUnauthorized: false })
}

function xaiFetch(
  body: string,
  apiKey: string,
): Promise<{ ok: boolean; status: number; text: () => Promise<string> }> {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(body, 'utf8')
    const req = https.request(
      {
        hostname: 'api.x.ai',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Length': payload.length,
        },
        agent: makeAgent(),
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          resolve({
            ok: (res.statusCode ?? 500) >= 200 && (res.statusCode ?? 500) < 300,
            status: res.statusCode ?? 500,
            text: () => Promise.resolve(text),
          })
        })
      },
    )
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

type ApiMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; content: string; tool_call_id: string }

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const {
    messages,
    entry,
    accessToken,
    teacher = DEFAULT_TEACHER,
  } = await req.json()

  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Brak klucza API' }, { status: 500 })

  const persona = TEACHERS[teacher] ?? TEACHERS[DEFAULT_TEACHER]

  // Build system prompt — current entry injected immediately
  let systemContent = persona.system
  if (entry) {
    const contentText = stripHtml(entry.content ?? '').slice(0, 2000)
    const moodText = entry.mood ? MOOD_LABEL[entry.mood as number] : null
    systemContent +=
      `\n\n---\nAktualnie otwarty wpis ucznia:\nData: ${entry.date}\nTytuł: "${entry.title || '(bez tytułu'}"` +
      (moodText ? `\nNastrój: ${moodText}` : '') +
      (contentText ? `\nTreść:\n${contentText}` : '')
  }

  const apiMessages: ApiMessage[] = [
    { role: 'system', content: systemContent },
    ...messages.map((m: { role: string; text: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.text,
    })),
  ]

  // Tool call loop — max 3 iterations to prevent infinite loops
  for (let iteration = 0; iteration < 3; iteration++) {
    const requestBody = JSON.stringify({
      model: 'grok-4.3',
      messages: apiMessages,
      tools: accessToken ? DIARY_TOOLS : undefined,
      tool_choice: accessToken ? 'auto' : undefined,
      max_tokens: 350,
      temperature: 0.85,
    })

    const response = await xaiFetch(requestBody, apiKey)

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: err }, { status: response.status })
    }

    const raw = await response.text()
    console.log('[chat/route] xAI raw (iter %d):', iteration, raw.slice(0, 300))

    let data: {
      choices?: {
        message?: {
          content?: string | null
          tool_calls?: ToolCall[]
        }
        finish_reason?: string
      }[]
    }
    try {
      data = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'Nieprawidłowa odpowiedź z API' }, { status: 502 })
    }

    const choice = data.choices?.[0]
    const assistantMsg = choice?.message
    const finishReason = choice?.finish_reason

    if (!assistantMsg) {
      return NextResponse.json({ error: 'Brak odpowiedzi z API' }, { status: 502 })
    }

    // Final text response
    if (finishReason !== 'tool_calls' && assistantMsg.content) {
      return NextResponse.json({ reply: assistantMsg.content })
    }

    // Tool calls — execute and loop
    if (finishReason === 'tool_calls' && assistantMsg.tool_calls?.length) {
      apiMessages.push({
        role: 'assistant',
        content: assistantMsg.content ?? null,
        tool_calls: assistantMsg.tool_calls,
      })

      for (const toolCall of assistantMsg.tool_calls) {
        let args: Record<string, unknown> = {}
        try { args = JSON.parse(toolCall.function.arguments) } catch { /* malformed args */ }

        const result = accessToken
          ? await executeTool(toolCall.function.name, args, accessToken)
          : 'Brak autoryzacji do pobierania wpisów.'

        apiMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        })
      }
      continue
    }

    return NextResponse.json(
      { error: `Nieoczekiwany finish_reason: ${finishReason ?? 'unknown'}` },
      { status: 502 },
    )
  }

  return NextResponse.json({ error: 'Zbyt wiele iteracji narzędzi' }, { status: 502 })
}
