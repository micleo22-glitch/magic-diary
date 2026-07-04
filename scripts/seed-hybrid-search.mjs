import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_COUNT = 350
const DEFAULT_BATCH_SIZE = 50
const EMBEDDING_MODEL = 'text-embedding-3-small'

loadEnvFile('.env.local')
loadEnvFile('.env')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const openaiApiKey = process.env.OPENAI_API_KEY
const userId = process.env.SEED_USER_ID
const count = parsePositiveInt(process.env.SEED_ENTRIES_COUNT, DEFAULT_COUNT)
const batchSize = parsePositiveInt(process.env.SEED_BATCH_SIZE, DEFAULT_BATCH_SIZE)
const seedRunId = process.env.SEED_RUN_ID || 'default'

if (!supabaseUrl) die('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!serviceRoleKey) die('Missing SUPABASE_SERVICE_ROLE_KEY')
if (!openaiApiKey) die('Missing OPENAI_API_KEY')
if (!userId) die('Missing SEED_USER_ID. Set it to auth.users.id for the test account.')

async function main() {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const entries = buildEntries(count, userId, seedRunId)
  let seeded = 0

  for (let index = 0; index < entries.length; index += batchSize) {
    const batch = entries.slice(index, index + batchSize)
    const embeddings = await generateEmbeddings(batch.map(entryToText))
    const rows = batch.map((entry, offset) => ({
      ...entry,
      embedding: embeddings[offset],
    }))

    const { error } = await supabase.from('entries').upsert(rows, { onConflict: 'id' })
    if (error) die(`Supabase upsert failed: ${error.message}`)

    seeded += rows.length
    console.log(`Seeded ${seeded}/${entries.length} entries`)
  }

  console.log(`Done. Seeded ${seeded} entries for user ${userId}.`)
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

function buildEntries(total, ownerId, runId) {
  const rows = []
  const today = startOfDay(new Date())
  const ownerSlug = ownerId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
  const runSlug = runId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 24) || 'default'

  for (let index = 0; index < total; index++) {
    const date = addDays(today, -pickDayOffset(index))
    const mood = pickMood(index, date)
    const theme = themes[index % themes.length]
    const detail = details[(index * 7 + mood) % details.length]
    const reflection = reflections[(index * 11 + mood) % reflections.length]
    const place = places[(index * 5 + mood) % places.length]
    const weather = weatherNotes[(index * 3 + mood) % weatherNotes.length]
    const isoDate = toIsoDate(date)
    const createdAt = new Date(date.getTime() + timeOfDay(index)).toISOString()
    const updatedAt = new Date(new Date(createdAt).getTime() + 1000 * 60 * ((index % 180) + 5)).toISOString()

    rows.push({
      id: `seed-hybrid-${runSlug}-${ownerSlug}-${String(index + 1).padStart(4, '0')}`,
      title: `${theme.title} - ${formatDisplayDate(date)}`,
      content: [
        `<p>${theme.opening[mood - 1]}</p>`,
        `<p>${detail} ${weather}</p>`,
        `<p>Miejsce: ${place}. ${reflection}</p>`,
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

function pickDayOffset(index) {
  const yearWindow = 540
  return (index * 17 + Math.floor(index / 9) * 29 + (index % 6) * 3) % yearWindow
}

function pickMood(index, date) {
  const day = date.getDay()
  if (index % 23 === 0) return 1
  if (index % 11 === 0) return 2
  if (day === 5 || day === 6) return 4 + (index % 2)
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

function timeOfDay(index) {
  const hour = 7 + (index * 5) % 15
  const minute = (index * 17) % 60
  return 1000 * 60 * (hour * 60 + minute)
}

const themes = [
  {
    title: 'Poranek z kawa',
    opening: [
      'Obudzilem sie ciezko i przez dluzsza chwile zbieralem mysli przy zimnej kawie.',
      'Poranek byl szorstki, ale udalo mi sie zrobic pierwsza rzecz z listy bez odkladania.',
      'Dzien zaczal sie spokojnie, z kawa i krotkim planem zapisanym na kartce.',
      'Od rana mialem wrazenie, ze wszystko jest na swoim miejscu.',
      'Wstalem wczesnie i zlapalem ten rzadki moment ciszy, zanim miasto ruszylo pelna para.',
    ],
  },
  {
    title: 'Praca nad projektem',
    opening: [
      'Projekt dzis ciazyl mi bardziej niz zwykle i trudno bylo znalezc sensowny punkt zaczepienia.',
      'Utknalem na drobiazgu, ktory zjadl za duzo energii, ale pod koniec dnia ruszylo.',
      'Zrobilem solidny kawalek pracy, bez fajerwerkow, za to rowno i konkretnie.',
      'Kilka decyzji projektowych wreszcie sie ulozylo i od razu zrobilo sie lzej.',
      'Mialem swietny rytm pracy, taki z rzadkich dni, kiedy mysli ukladaja sie same.',
    ],
  },
  {
    title: 'Spacer po miescie',
    opening: [
      'Wyszedlem tylko na chwile, ale szare ulice pasowaly dzis do nastroju az za dobrze.',
      'Spacer pomogl mi przewietrzyc glowe, choc wrocilem nadal troche przygaszony.',
      'Przeszedlem dluzsza trasa niz zwykle i zauwazylem kilka miejsc, ktore zwykle mijam bez patrzenia.',
      'Miasto bylo dzis przyjemnie zywe, a ja poczulem, ze odzyskuje tempo.',
      'Wieczorny spacer okazal sie najlepsza czescia dnia, z cieplym swiatlem w oknach i lekka glowa.',
    ],
  },
  {
    title: 'Rozmowa',
    opening: [
      'Rozmowa, ktorej unikalem, wrocila dzis ze zdwojona sila i zostawila mnie zmeczonego.',
      'Powiedzialem troche mniej, niz chcialem, ale przynajmniej nie ucieklem od tematu.',
      'Spotkanie bylo zwyczajne, a jednak potrzebne, bo uporzadkowalo kilka drobnych napiec.',
      'Dobra rozmowa przywrocila mi poczucie, ze nie musze wszystkiego dzwigac sam.',
      'Uslyszalem dzis cos, co dlugo zostanie ze mna w dobrym sensie.',
    ],
  },
  {
    title: 'Domowy wieczor',
    opening: [
      'Wieczorem opadlo ze mnie zmeczenie i wszystko wydawalo sie zbyt glosne.',
      'Zrobilem minimum: kolacja, pranie, kilka wiadomosci, potem cisza.',
      'Domowy wieczor byl prosty i potrzebny, bez wielkich planow.',
      'Udalo mi sie ugotowac cos dobrego i uporzadkowac kuchnie, co dziwnie poprawilo humor.',
      'Wieczor byl miekki i spokojny, z muzyka w tle i poczuciem dobrze domknietego dnia.',
    ],
  },
  {
    title: 'Nauka i notatki',
    opening: [
      'Czytanie szlo dzis wolno, kazde zdanie wymagalo drugiego podejscia.',
      'Nie wszystko zrozumialem od razu, ale notatki zaczely lapac ksztalt.',
      'Przerobilem zaplanowany material i zostawilem sobie jasne punkty na jutro.',
      'Nauka dala mi dzis satysfakcje, zwlaszcza kiedy trudny fragment wreszcie kliknal.',
      'Mialem poczucie prawdziwego postepu i az chcialo sie dopisac kolejne przyklady.',
    ],
  },
  {
    title: 'Rodzinne sprawy',
    opening: [
      'Rodzinny temat wrocil dzis w najmniej wygodnym momencie i trudno bylo mi zachowac spokoj.',
      'Nie wszystko poszlo gladko, ale przynajmniej nazwalismy rzeczy po imieniu.',
      'Dzien mial kilka malych domowych obowiazkow, ktore dobrze bylo odhaczyc.',
      'Krotka rozmowa z bliska osoba dala mi wiecej otuchy, niz sie spodziewalem.',
      'Wieczorem poczulem wdziecznosc za zwykle, cieple gesty, ktore latwo przeoczyc.',
    ],
  },
  {
    title: 'Zdrowie i energia',
    opening: [
      'Cialo od rana dawalo znac, ze limit zostal przekroczony juz wczoraj.',
      'Mialem mniej energii niz chcialem, ale udalo mi sie nie dokladac sobie presji.',
      'Zrobilem spokojny trening i pilnowalem jedzenia, bez wielkich deklaracji.',
      'Ruch dobrze mi zrobil i przez reszte dnia latwiej bylo zlapac rownowage.',
      'Czulem sie lekko, jakby organizm wreszcie dostal to, o co prosil od tygodni.',
    ],
  },
]

const details = [
  'Najbardziej zapamietalem maly szczegol: zapach deszczu na chodniku i swiatlo odbite w szybie autobusu.',
  'Po poludniu zrobilem liste trzech spraw, ktore realnie da sie zamknac, zamiast udawac, ze ogarne wszystko.',
  'W tle caly czas wracala mysl o zaleglej wiadomosci, wiec w koncu odpisalem krotko i uczciwie.',
  'Zjadlem pozny obiad i dopiero wtedy zauwazylem, jak bardzo bylem przebodzcowany.',
  'Najlepiej zadzialala przerwa bez telefonu, tylko dziesiec minut patrzenia przez okno.',
  'Ktos powiedzial mi jedno zyczliwe zdanie i zupelnie zmienilo to temperature dnia.',
  'Plan dnia rozjechal sie po poludniu, ale kilka mniejszych rzeczy udalo sie uratowac.',
  'Wieczorem wrocilem do notatek i dopisalem kilka obserwacji, ktorych rano jeszcze nie umialem nazwac.',
  'Zaskoczylo mnie, jak duzo energii daje zwykle uporzadkowanie biurka.',
  'Przez chwile mialem ochote wszystko odlozyc, ale pomoglo rozbicie zadania na naprawde male kroki.',
  'W kalendarzu zostalo kilka luk, ktore okazaly sie cenniejsze niz kolejny ambitny plan.',
  'Najtrudniejsze bylo przyznac, ze potrzebuje pomocy, zanim frustracja zrobi sie zbyt duza.',
  'Po drodze kupilem drobiazg, ktory nie byl potrzebny, ale poprawil mi humor bardziej niz powinien.',
  'W pracy rozmowy byly konkretne i krotkie, dzieki czemu zostalo troche miejsca na myslenie.',
  'Pod koniec dnia dopadlo mnie zmeczenie, ale tym razem nie pomylilem go z porazka.',
]

const reflections = [
  'Na jutro zostawiam sobie jedna prosta intencje: zaczac spokojnie, bez gonienia wlasnych oczekiwan.',
  'Widze, ze kiedy zapisuje rzeczy od razu, mniej mnie potem strasza w glowie.',
  'To byl dzien bez wielkich przelomow, ale z kilkoma uczciwymi krokami do przodu.',
  'Chce czesciej pamietac, ze odpoczynek nie jest nagroda za perfekcyjnie wykonany plan.',
  'Najwazniejsze bylo dzis nie tempo, tylko to, ze wrocilem do siebie po malym chaosie.',
  'Dobrze miec dowod, ze nawet gorszy nastroj nie musi decydowac o calym dniu.',
  'Zapisuje to, bo za tydzien moge juz nie pamietac, jak bardzo potrzebny byl ten spokoj.',
  'Jutro sprobuje zaczac od rzeczy, ktora zwykle zostawiam na koniec.',
  'Cialo wyraznie prosi o sen, wiec nie bede przeciagac wieczoru bez sensu.',
  'Mam poczucie, ze cos we mnie powoli sie porzadkuje, nawet jesli z zewnatrz wyglada to zwyczajnie.',
  'Dobrze zadzialalo nazwanie emocji jednym zdaniem zamiast budowania calej opowiesci.',
  'Nie musze robic z tego lekcji zycia, wystarczy zapamietac, co pomoglo.',
]

const places = [
  'kuchenny stol',
  'biurko przy oknie',
  'tramwaj w drodze do centrum',
  'park za osiedlem',
  'mala kawiarnia obok pracy',
  'kanapa w salonie',
  'biblioteka',
  'dlugi chodnik przy rzece',
]

const weatherNotes = [
  'Za oknem bylo pochmurno, ale bez tej ciezkiej szarosci.',
  'Deszcz kilka razy przerywal plany i wymuszal wolniejsze tempo.',
  'Slonce pojawilo sie dopiero pod wieczor i od razu zmienilo nastroj.',
  'Powietrze bylo duszne, przez co wszystko wydawalo sie bardziej meczace.',
  'Chlodny wiatr pomogl mi sie obudzic lepiej niz druga kawa.',
  'Bylo cicho i jasno, prawie jak w pierwszy dzien po dlugiej przerwie.',
]

main().catch(error => die(error instanceof Error ? error.message : String(error)))
