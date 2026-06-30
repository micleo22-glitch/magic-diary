import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

loadEnvFile('.env.local')
loadEnvFile('.env')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const openaiApiKey = process.env.OPENAI_API_KEY
const email = process.env.TEST_USER_EMAIL ?? 'test@magicdiary.local'
const password = process.env.TEST_USER_PASSWORD ?? 'test123456'
const startDate = process.env.FILL_START_DATE ?? '2026-05-01'
const endDate = process.env.FILL_END_DATE ?? new Date().toISOString().slice(0, 10)
const fallbackToExistingEmbeddings = process.env.FILL_FALLBACK_TO_EXISTING_EMBEDDINGS !== 'false'

if (!supabaseUrl) die('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!anonKey) die('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')

const supabase = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) die(`Sign in failed: ${authError.message}`)
  if (!authData.user) die('Sign in succeeded without a user')

  const userId = authData.user.id
  const sourceEntries = await getSourceEntries()
  const entries = sourceEntries.length
    ? buildEntriesFromSource(userId, startDate, endDate, sourceEntries)
    : buildDailyEntries(userId, startDate, endDate)
  const existingDates = await getExistingDates(startDate, endDate)
  const missingEntries = entries.filter(entry => !existingDates.has(entry.date))

  if (!missingEntries.length) {
    console.log(`No missing entries from ${startDate} to ${endDate}`)
    process.exit(0)
  }

  for (let index = 0; index < missingEntries.length; index += 25) {
    const batch = missingEntries.slice(index, index + 25)
    const embeddings = batch.every(entry => entry.embedding != null)
      ? batch.map(entry => entry.embedding)
      : await generateEmbeddings(batch.map(entryToText))
    const rows = batch.map((entry, offset) => ({ ...entry, embedding: embeddings[offset] }))
    const { error } = await supabase.from('entries').upsert(rows, { onConflict: 'id' })

    if (error) die(`Upsert failed: ${error.message}`)
    console.log(`Added ${Math.min(index + batch.length, missingEntries.length)}/${missingEntries.length}`)
  }

  console.log({
    userId,
    startDate,
    endDate,
    added: missingEntries.length,
  })
}

main().catch(error => die(error instanceof Error ? error.message : String(error)))

function buildDailyEntries(userId, from, to) {
  const rows = []
  let index = 0

  for (const date of dateRange(from, to)) {
    const mood = moodForDate(date, index)
    const pattern = patterns[index % patterns.length]
    const detail = details[(index * 5 + mood) % details.length]
    const reflection = reflections[(index * 7 + mood) % reflections.length]
    const createdAt = createdAtForDate(date, index)

    rows.push({
      id: `daily-${userId.slice(0, 8)}-${date}`,
      title: `${pattern.title}: ${formatDate(date)}`,
      content: [
        `<p>${pattern.opening[mood - 1]}</p>`,
        `<p>${detail}</p>`,
        `<p>${reflection}</p>`,
      ].join(''),
      mood,
      date,
      created_at: createdAt,
      updated_at: new Date(new Date(createdAt).getTime() + 1000 * 60 * (15 + index)).toISOString(),
      user_id: userId,
      photos: [],
      strapi_id: null,
    })

    index += 1
  }

  return rows
}

async function getExistingDates(from, to) {
  const { data, error } = await supabase
    .from('entries')
    .select('date')
    .gte('date', from)
    .lte('date', to)

  if (error) die(`Could not read existing entries: ${error.message}`)
  return new Set((data ?? []).map(row => row.date))
}

async function getSourceEntries() {
  const { data, error } = await supabase
    .from('entries')
    .select('title, content, mood, embedding')
    .gte('date', '2026-04-01')
    .lte('date', '2026-04-30')
    .not('embedding', 'is', null)
    .order('date', { ascending: true })

  if (error) die(`Could not read source entries: ${error.message}`)
  return data ?? []
}

function buildEntriesFromSource(userId, from, to, sourceEntries) {
  const rows = []
  let index = 0

  for (const date of dateRange(from, to)) {
    const source = sourceEntries[index % sourceEntries.length]
    const createdAt = createdAtForDate(date, index)

    rows.push({
      id: `daily-${userId.slice(0, 8)}-${date}`,
      title: rewriteTitle(source.title, date),
      content: source.content,
      mood: source.mood,
      date,
      created_at: createdAt,
      updated_at: new Date(new Date(createdAt).getTime() + 1000 * 60 * (15 + index)).toISOString(),
      user_id: userId,
      embedding: source.embedding,
      photos: [],
      strapi_id: null,
    })

    index += 1
  }

  return rows
}

function rewriteTitle(title, date) {
  const separator = title.indexOf(':')
  const prefix = separator === -1 ? 'Dziennik' : title.slice(0, separator)
  return `${prefix}: ${formatDate(date)}`
}

async function generateEmbeddings(inputs) {
  if (!openaiApiKey) die('Missing OPENAI_API_KEY')

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: inputs,
    }),
  })

  if (!response.ok) {
    const message = `OpenAI embeddings failed: ${response.status} ${await response.text()}`
    if (!fallbackToExistingEmbeddings) die(message)
    throw new Error(message)
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

function* dateRange(from, to) {
  const current = new Date(`${from}T00:00:00.000Z`)
  const end = new Date(`${to}T00:00:00.000Z`)

  while (current <= end) {
    yield current.toISOString().slice(0, 10)
    current.setUTCDate(current.getUTCDate() + 1)
  }
}

function moodForDate(date, index) {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay()
  if (day === 0) return 4
  if (day === 6) return 5
  if (index % 17 === 0) return 2
  if (index % 11 === 0) return 1
  if (index % 5 === 0) return 3
  return 3 + (index % 3)
}

function createdAtForDate(date, index) {
  const hour = 18 + (index % 4)
  const minute = (index * 13) % 60
  return new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`).toISOString()
}

function formatDate(date) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00.000Z`))
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

function die(message) {
  console.error(message)
  process.exit(1)
}

const patterns = [
  {
    title: 'Majowy rytm',
    opening: [
      'Dzień zaczął się ciężko, jakby cała energia została gdzieś po drodze.',
      'Od rana było trochę pod górę, ale przynajmniej udało się nie odpuścić wszystkiego.',
      'Zwyczajny dzień, bez wielkich zdarzeń, za to z kilkoma małymi punktami zaczepienia.',
      'Majowe światło zrobiło dziś dużo dobrego, nawet jeśli sprawy szły swoim tempem.',
      'Miałem dziś przyjemne poczucie, że robi się jaśniej nie tylko za oknem.',
    ],
  },
  {
    title: 'Notatki po pracy',
    opening: [
      'Praca szła dziś opornie i łapałem się na tym, że za często uciekam w drobiazgi.',
      'Kilka rzeczy przeciągnęło się bardziej, niż planowałem, ale dzień nie był stracony.',
      'Zamknąłem najważniejsze zadanie i zostawiłem sobie czysty punkt startu na jutro.',
      'Dobrze było zobaczyć, że konsekwencja działa nawet wtedy, gdy tempo nie zachwyca.',
      'Wpadłem w mocny rytm i przez parę godzin naprawdę czułem skupienie.',
    ],
  },
  {
    title: 'Wieczorne podsumowanie',
    opening: [
      'Wieczorem wszystko trochę siadło i miałem ochotę wyłączyć świat na godzinę.',
      'Zmęczenie przyszło wcześnie, ale ciepła kolacja i cisza zrobiły swoje.',
      'Podsumowałem dzień bez oceniania, bardziej jak raport z pogody wewnętrznej.',
      'W domu zrobiło się spokojnie i wreszcie mogłem usłyszeć własne myśli.',
      'To był jeden z tych wieczorów, które zostają w pamięci przez prostotę.',
    ],
  },
  {
    title: 'Spacer i myśli',
    opening: [
      'Spacer był krótki i trochę ponury, ale przynajmniej ruszyłem się z miejsca.',
      'Wyszedłem przewietrzyć głowę i wróciłem odrobinę lżejszy.',
      'Po drodze zauważyłem kilka zwykłych rzeczy, które dziś miały dziwnie kojący ciężar.',
      'Miasto pachniało deszczem i zielenią, a ja poczułem, że napięcie powoli schodzi.',
      'Długi spacer zrobił mi więcej porządku w głowie niż wszystkie listy zadań.',
    ],
  },
]

const details = [
  'Najmocniej zostało ze mną światło na parapecie i ten moment, kiedy herbata przestała parzyć w dłonie.',
  'W ciągu dnia kilka razy wracałem do tej samej myśli, ale tym razem zapisałem ją zamiast mielić w kółko.',
  'Pomogło mi zrobienie jednej rzeczy do końca, bez przeskakiwania między pięcioma oknami.',
  'Rozmowa w połowie dnia była krótka, ale wystarczyła, żeby zmienić perspektywę.',
  'Zauważyłem, że ciało szybciej niż głowa wie, kiedy trzeba zrobić przerwę.',
  'Nie wszystko poszło według planu, ale plan przynajmniej był na tyle prosty, że dało się wrócić na tor.',
  'Wieczorem uporządkowałem kilka notatek i nagle ten tydzień zaczął wyglądać mniej chaotycznie.',
  'Najbardziej ucieszyła mnie mała rzecz: czysty stół, spokojna muzyka i brak pośpiechu.',
]

const reflections = [
  'Na jutro zabieram jedną lekcję: zaczynać od rzeczy prawdziwej, nie od najłatwiejszej ucieczki.',
  'Dobrze widzieć, że nawet cichy dzień może coś dopowiedzieć, jeśli dam mu miejsce.',
  'Nie muszę mieć wielkiej puenty, wystarczy, że zauważę, co dzisiaj faktycznie było ważne.',
  'Chcę częściej kończyć dzień takim spokojnym zapisem, bez poprawiania go na siłę.',
  'Mam poczucie, że te drobne powroty do rytmu składają się w coś większego.',
  'Jutro spróbuję odpuścić jedną rzecz, która tylko udaje pilną.',
  'To był dobry przypominacz, że nastrój się zmienia, a decyzje mogą zostać proste.',
  'Zapisuję to, bo właśnie takie zwyczajne dni najłatwiej znikają z pamięci.',
]
