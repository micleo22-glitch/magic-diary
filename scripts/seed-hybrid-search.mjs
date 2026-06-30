import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'

const DEFAULT_COUNT = 350
const EMBEDDING_MODEL = 'text-embedding-3-small'

loadEnvFile('.env.local')
loadEnvFile('.env')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const openaiApiKey = process.env.OPENAI_API_KEY
const userId = process.env.SEED_USER_ID
const count = parsePositiveInt(process.env.SEED_ENTRIES_COUNT, DEFAULT_COUNT)
const batchSize = parsePositiveInt(process.env.SEED_BATCH_SIZE, 50)

if (!supabaseUrl) die('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!serviceRoleKey) die('Missing SUPABASE_SERVICE_ROLE_KEY')
if (!openaiApiKey) die('Missing OPENAI_API_KEY')
if (!userId) die('Missing SEED_USER_ID. Set it to auth.users.id for the test account.')

async function main() {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const entries = buildEntries(count, userId)
  let inserted = 0

  for (let index = 0; index < entries.length; index += batchSize) {
    const batch = entries.slice(index, index + batchSize)
    const embeddings = await generateEmbeddings(batch.map(entryToText))
    const rows = batch.map((entry, offset) => ({
      ...entry,
      embedding: embeddings[offset],
    }))

    const { error } = await supabase.from('entries').upsert(rows, { onConflict: 'id' })
    if (error) die(`Supabase upsert failed: ${error.message}`)

    inserted += rows.length
    console.log(`Seeded ${inserted}/${entries.length} entries`)
  }

  console.log(`Done. Seeded ${inserted} entries for user ${userId}.`)
}

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName)
  if (!existsSync(filePath)) return

  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) process.env[key] = value
  }
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function die(message) {
  console.error(message)
  process.exit(1)
}

function entryToText(entry) {
  return `${entry.title}\n\n${stripHtml(entry.content)}`
}

function stripHtml(html) {
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

async function generateEmbeddings(inputs) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: inputs,
    }),
  })

  if (!response.ok) {
    die(`OpenAI embeddings failed: ${response.status} ${await response.text()}`)
  }

  const json = await response.json()
  const embeddings = json.data
    ?.sort((a, b) => a.index - b.index)
    .map(item => item.embedding)

  if (!Array.isArray(embeddings) || embeddings.length !== inputs.length) {
    die('OpenAI returned an unexpected embeddings payload')
  }

  return embeddings
}

function buildEntries(total, ownerId) {
  const usedDates = new Set()
  const rows = []
  const today = startOfDay(new Date())

  for (let index = 0; index < total; index++) {
    const date = pickDate(today, index, usedDates)
    const mood = pickMood(index, date)
    const theme = themes[index % themes.length]
    const detail = details[(index * 7 + mood) % details.length]
    const reflection = reflections[(index * 11 + mood) % reflections.length]
    const title = `${theme.title}: ${formatDisplayDate(date)}`
    const isoDate = toIsoDate(date)
    const createdAt = new Date(date.getTime() + randomHour(index)).toISOString()
    const updatedAt = new Date(new Date(createdAt).getTime() + 1000 * 60 * ((index % 180) + 5)).toISOString()

    rows.push({
      id: `seed-hybrid-${isoDate}-${randomUUID()}`,
      title,
      content: [
        `<p>${theme.opening[mood - 1]}</p>`,
        `<p>${detail}</p>`,
        `<p>${reflection}</p>`,
      ].join(''),
      mood,
      date: isoDate,
      created_at: createdAt,
      updated_at: updatedAt,
      user_id: ownerId,
      photos: [],
      strapi_id: null,
    })
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date))
}

function pickDate(today, index, usedDates) {
  const maxDaysBack = Math.max(540, index + 30)
  let offset = (index * 37 + Math.floor(index / 7) * 11) % maxDaysBack
  let date = addDays(today, -offset)

  while (usedDates.has(toIsoDate(date))) {
    offset += 1
    date = addDays(today, -offset)
  }

  usedDates.add(toIsoDate(date))
  return date
}

function pickMood(index, date) {
  const day = date.getDay()
  if (day === 5 || day === 6) return 4 + (index % 2)
  if (index % 13 === 0) return 1
  if (index % 7 === 0) return 2
  if (index % 5 === 0) return 3
  return 3 + (index % 3)
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date, days) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10)
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function randomHour(index) {
  const hour = 7 + (index * 5) % 15
  const minute = (index * 17) % 60
  return 1000 * 60 * (hour * 60 + minute)
}

const themes = [
  {
    title: 'Poranek z kawą',
    opening: [
      'Obudziłem się ciężko i przez dłuższą chwilę zbierałem myśli przy zimnej kawie.',
      'Poranek był szorstki, ale udało mi się zrobić pierwszą rzecz z listy bez odkładania.',
      'Dzień zaczął się spokojnie, z kawą i krótkim planem zapisanym na kartce.',
      'Od rana miałem wrażenie, że wszystko jest na swoim miejscu.',
      'Wstałem wcześnie i złapałem ten rzadki moment ciszy, zanim miasto ruszyło pełną parą.',
    ],
  },
  {
    title: 'Praca nad projektem',
    opening: [
      'Projekt dziś ciążył mi bardziej niż zwykle i trudno było znaleźć sensowny punkt zaczepienia.',
      'Utknąłem na drobiazgu, który zjadł za dużo energii, ale pod koniec dnia ruszyło.',
      'Zrobiłem solidny kawałek pracy, bez fajerwerków, za to równo i konkretnie.',
      'Kilka decyzji projektowych wreszcie się ułożyło i od razu zrobiło się lżej.',
      'Miałem świetny rytm pracy, taki z rzadkich dni, kiedy myśli układają się same.',
    ],
  },
  {
    title: 'Spacer po mieście',
    opening: [
      'Wyszedłem tylko na chwilę, ale szare ulice pasowały dziś do nastroju aż za dobrze.',
      'Spacer pomógł mi przewietrzyć głowę, choć wróciłem nadal trochę przygaszony.',
      'Przeszedłem dłuższą trasą niż zwykle i zauważyłem kilka miejsc, które zwykle mijam bez patrzenia.',
      'Miasto było dziś przyjemnie żywe, a ja poczułem, że odzyskuję tempo.',
      'Wieczorny spacer okazał się najlepszą częścią dnia, z ciepłym światłem w oknach i lekką głową.',
    ],
  },
  {
    title: 'Rozmowa',
    opening: [
      'Rozmowa, której unikałem, wróciła dziś ze zdwojoną siłą i zostawiła mnie zmęczonego.',
      'Powiedziałem trochę mniej, niż chciałem, ale przynajmniej nie uciekłem od tematu.',
      'Spotkanie było zwyczajne, a jednak potrzebne, bo uporządkowało kilka drobnych napięć.',
      'Dobra rozmowa przywróciła mi poczucie, że nie muszę wszystkiego dźwigać sam.',
      'Usłyszałem dziś coś, co długo zostanie ze mną w dobrym sensie.',
    ],
  },
  {
    title: 'Domowy wieczór',
    opening: [
      'Wieczorem opadło ze mnie zmęczenie i wszystko wydawało się zbyt głośne.',
      'Zrobiłem minimum: kolacja, pranie, kilka wiadomości, potem cisza.',
      'Domowy wieczór był prosty i potrzebny, bez wielkich planów.',
      'Udało mi się ugotować coś dobrego i uporządkować kuchnię, co dziwnie poprawiło humor.',
      'Wieczór był miękki i spokojny, z muzyką w tle i poczuciem dobrze domkniętego dnia.',
    ],
  },
  {
    title: 'Nauka i notatki',
    opening: [
      'Czytanie szło dziś wolno, każde zdanie wymagało drugiego podejścia.',
      'Nie wszystko zrozumiałem od razu, ale notatki zaczęły łapać kształt.',
      'Przerobiłem zaplanowany materiał i zostawiłem sobie jasne punkty na jutro.',
      'Nauka dała mi dziś satysfakcję, zwłaszcza kiedy trudny fragment wreszcie kliknął.',
      'Miałem poczucie prawdziwego postępu i aż chciało się dopisać kolejne przykłady.',
    ],
  },
]

const details = [
  'Najbardziej zapamiętałem mały szczegół: zapach deszczu na chodniku i światło odbite w szybie autobusu.',
  'Po południu zrobiłem listę trzech spraw, które realnie da się zamknąć, zamiast udawać, że ogarnę wszystko.',
  'W tle cały czas wracała myśl o zaległej wiadomości, więc w końcu odpisałem krótko i uczciwie.',
  'Zjadłem późny obiad i dopiero wtedy zauważyłem, jak bardzo byłem przebodźcowany.',
  'Najlepiej zadziałała przerwa bez telefonu, tylko dziesięć minut patrzenia przez okno.',
  'Ktoś powiedział mi jedno życzliwe zdanie i zupełnie zmieniło to temperaturę dnia.',
  'Plan dnia rozjechał się po południu, ale kilka mniejszych rzeczy udało się uratować.',
  'Wieczorem wróciłem do notatek i dopisałem kilka obserwacji, których rano jeszcze nie umiałem nazwać.',
  'Zaskoczyło mnie, jak dużo energii daje zwykłe uporządkowanie biurka.',
  'Przez chwilę miałem ochotę wszystko odłożyć, ale pomogło rozbicie zadania na naprawdę małe kroki.',
]

const reflections = [
  'Na jutro zostawiam sobie jedną prostą intencję: zacząć spokojnie, bez gonienia własnych oczekiwań.',
  'Widzę, że kiedy zapisuję rzeczy od razu, mniej mnie potem straszą w głowie.',
  'To był dzień bez wielkich przełomów, ale z kilkoma uczciwymi krokami do przodu.',
  'Chcę częściej pamiętać, że odpoczynek nie jest nagrodą za perfekcyjnie wykonany plan.',
  'Najważniejsze było dziś nie tempo, tylko to, że wróciłem do siebie po małym chaosie.',
  'Dobrze mieć dowód, że nawet gorszy nastrój nie musi decydować o całym dniu.',
  'Zapisuję to, bo za tydzień mogę już nie pamiętać, jak bardzo potrzebny był ten spokój.',
  'Jutro spróbuję zacząć od rzeczy, którą zwykle zostawiam na koniec.',
  'Ciało wyraźnie prosi o sen, więc nie będę przeciągać wieczoru bez sensu.',
  'Mam poczucie, że coś we mnie powoli się porządkuje, nawet jeśli z zewnątrz wygląda to zwyczajnie.',
]

main().catch(error => die(error instanceof Error ? error.message : String(error)))
