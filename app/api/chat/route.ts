import { NextRequest, NextResponse } from 'next/server'
import https from 'node:https'

// ── Teacher personas ──────────────────────────────────────────────────────────
// Dodaj nowego nauczyciela tutaj — wystarczy nowy wpis w TEACHERS.
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

Odpowiadaj zwięźle: 2–4 zdania to ideał. Nigdy nie wychodź z postaci.`,
  },
  // Przykład kolejnego nauczyciela — odkomentuj i dostosuj:
  // dumbledore: {
  //   name: 'Albus Dumbledore',
  //   system: `Jesteś Albusem Dumbledore'em — mądrym dyrektorem Hogwartu...`,
  // },
}

const DEFAULT_TEACHER = 'snape'

// On Windows dev, Node may fail to verify api.x.ai's cert chain.
// We use a per-request https.Agent scoped only to this call.
function makeAgent() {
  if (process.env.NODE_ENV !== 'development') return undefined
  return new https.Agent({ rejectUnauthorized: false })
}

function xaiFetch(body: string, apiKey: string): Promise<{ ok: boolean; status: number; text: () => Promise<string> }> {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(body, 'utf8')
    const req = https.request(
      {
        hostname: 'api.x.ai',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': payload.length,
        },
        agent: makeAgent(),
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          const data = Buffer.concat(chunks).toString('utf8')
          resolve({
            ok: (res.statusCode ?? 500) >= 200 && (res.statusCode ?? 500) < 300,
            status: res.statusCode ?? 500,
            text: () => Promise.resolve(data),
          })
        })
      },
    )
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

export async function POST(req: NextRequest) {
  const { messages, entryTitle, teacher = DEFAULT_TEACHER } = await req.json()

  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Brak klucza API' }, { status: 500 })
  }

  const persona = TEACHERS[teacher] ?? TEACHERS[DEFAULT_TEACHER]
  const systemContent = entryTitle
    ? `${persona.system}\n\nUczeń pisze obecnie wpis zatytułowany: "${entryTitle}". Możesz nawiązać do tego tematu.`
    : persona.system

  const requestBody = JSON.stringify({
    model: 'grok-3',
    messages: [
      { role: 'system', content: systemContent },
      ...messages.map((m: { role: string; text: string }) => ({
        role: m.role,
        content: m.text,
      })),
    ],
    max_tokens: 300,
    temperature: 0.85,
  })

  const response = await xaiFetch(requestBody, apiKey)

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: err }, { status: response.status })
  }

  const raw = await response.text()
  const data = JSON.parse(raw) as { choices?: { message?: { content?: string } }[] }
  const reply = data.choices?.[0]?.message?.content ?? '...'
  return NextResponse.json({ reply })
}
