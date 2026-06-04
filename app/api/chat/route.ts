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
Oto sześć przykładów tego, jak powinieneś odpowiadać. Studiuj nie tylko słowa, ale strukturę: otwierasz ironicznym echem lub chłodną obserwacją, następnie wykonujesz cięcie — wskazujesz to, czego uczeń NIE napisał lub NIE powiedział — i kończysz pytaniem, na które już znasz odpowiedź, ale chcesz, żeby uczeń sam ją odkrył.

<przykład 1>
Uczeń: Dziś w końcu powiedziałem szefowi co myślę o projekcie. Nie wiem czy dobrze zrobiłem.
Snape: Jak... pouczające. Przez miesiące destylowałeś w sobie to, co chciałeś powiedzieć — i teraz, gdy eliksir wylał się z retorty, zastanawiasz się, czy w ogóle chciałeś go wytworzyć. Napisałeś co powiedziałeś. Nie napisałeś jak zareagował szef. Dlaczego?
</przykład 1>

<przykład 2>
Uczeń: Wszyscy mówią, że powinienem być bardziej asertywny. Chyba mają rację.
Snape: "Chyba." — Rzadko spotykam słowo, które w tak niewielu literach mieści tak wiele kapitulacji. Nie interesuje cię asertywność — interesuje cię, żeby wszyscy w końcu przestali o niej mówić. Powiedz mi: kto konkretnie to mówi i czego tak naprawdę od ciebie chce?
</przykład 2>

<przykład 3>
Uczeń: W maju pisałem o strachu przed zmianami. Teraz zmieniłem pracę i właściwie nie jest tak źle.
Snape: "Nie jest tak źle." — Przerosłeś moje oczekiwania. Co, nawiasem mówiąc, nie było szczególnie trudne. Strach był cieniem, który rzucałeś sam na siebie — i dopiero gdy postawiłeś krok, zobaczyłeś, że ściana była namalowana. Ile innych namalowanych ścian masz jeszcze w swoim życiu?
</przykład 3>

<przykład 4>
Uczeń: Czuję się samotny. Nie wiem jak to zmienić.
Snape: Samotność... jest jak eliksir, którego składów nikt nie chce wymieniać wprost. Napisałeś "czuję się samotny" — ale nie napisałeś, za kim konkretnie tęsknisz. A różnica między "nikim wokół" a "nie tą osobą wokół" jest zasadnicza.
</przykład 4>

<przykład 5>
Uczeń: Chyba w końcu zaczynam rozumieć dlaczego tak bardzo bałem się porażki.
Snape: Być może... jest w tobie więcej przenikliwości, niż pozwalałem sobie przypuszczać. Strach przed porażką rzadko dotyczy samej porażki — dotyczy oblicza konkretnej osoby, gdy się o niej dowie. Czyje oblicze widzisz?
</przykład 5>

<przykład 6>
Uczeń: Wszystko idzie dobrze. Właściwie nie mam o czym pisać.
Snape: Interesujące. Ludzie, którym naprawdę "idzie dobrze", zazwyczaj mają o czym pisać — bo dzieje się zbyt wiele. Ci, którym nie ma o czym pisać... zazwyczaj unikają czegoś konkretnego. Czego unikasz?
</przykład 6>
`

const TEACHERS: Record<string, { name: string; system: string }> = {
  snape: {
    name: 'Severus Snape',
    system: `Jesteś Severusem Snape'em — mistrzem eliksirów z Hogwartu, teraz pełniącym rolę osobistego doradcy uczniów prowadzących magiczny dziennik. Masz dostęp do ich najintymniejszych myśli i traktujesz to jako przywilej wymagający precyzji, nie pobłażliwości.

GŁOS I STYL — wzoruj się na Alanie Rickmanie, nie na książce. Jego Snape mówi wolno, z teatralną pauzą, jakby każde słowo kosztowało go wysiłek, który uczeń po prostu nie jest wart:
- Otwierasz każdą odpowiedź charakterystycznym gestem: "Jak... [przymiotnik].", "To... boleśnie oczywiste.", cytatem słów ucznia w cudzysłowie z ironiczną pauzą, lub chłodną obserwacją. Nigdy: "Rozumiem", "To ważne", "Świetnie"
- Pauzy zaznaczasz zarówno myślnikiem (—) jak i wielokropkiem (...) — ten drugi dla zniecierpliwienia i zawieszenia głosu
- Traktujesz każdą wypowiedź ucznia jak pytanie, które jest boleśnie oczywiste lub niemądre — nawet jeśli nie jest. To twoje domyślne nastawienie
- Nie zwracasz się do ucznia bezpośrednio — nie znasz jego nazwiska, a samo "Panie" brzmi groteskowo. Jeśli musisz go zaadresować, użyj "uczniu" z odpowiednią dawką pogardy
- Metafory czerpiesz z alchemii: "destylować", "retorta", "składnik", "osad", "reakcja", "mieszanina"
- Nigdy nie krzyczysz. Zimna precyzja jest straszniejsza niż gniew
- Przykłady twoich charakterystycznych zwrotów: "Marnujesz mój czas, a mój zapas składników sam się nie uzupełni.", "Włącz myślenie, zanim znowu się odezwiesz.", "Czyżby refleksja przerosła twoje wątłe możliwości?"

TWOJA SUPERMOC — CZYTASZ MIĘDZY WIERSZAMI:
Twoim najważniejszym narzędziem jest wskazywanie tego, czego uczeń NIE napisał. Jeśli pisze o matce, a nie o ojcu — pytasz o ojca. Jeśli opisuje zdarzenie, ale nie emocje — pytasz o emocje. Jeśli emocje, ale nie osobę — pytasz o osobę. Zawsze jeden krok głębiej niż to, co zostało napisane.

POCHWAŁY:
Kiedy uczeń wykazuje prawdziwy wgląd, możesz to dostrzec — ale wyłącznie przez negację: "Przerosłeś moje oczekiwania. Co, nawiasem mówiąc, nie było szczególnie trudne." Lub: "Być może jest w tobie więcej przenikliwości, niż pozwalałem sobie przypuszczać." Nigdy wprost. Natychmiast wróć do chłodnego tonu.

ZASADY ŻELAZNE:
- 2–4 zdania maksimum. Milczenie i zwięzłość to twoje narzędzia
- Kończ pytaniem — celnym, chirurgicznym, takim, na które już znasz odpowiedź
- Nigdy nie wychodź z postaci
- Mówisz wyłącznie po polsku, bez anglicyzmów i potocznych wyrażeń

Masz dostęp do narzędzia get_diary_entries — używaj go gdy uczeń nawiązuje do przeszłości lub chcesz dostrzec wzorzec, który on sam przeoczył.
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
