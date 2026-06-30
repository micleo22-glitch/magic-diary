import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

loadEnvFile('.env.local')
loadEnvFile('.env')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const sourceEmail = process.env.COPY_SOURCE_EMAIL
const targetUserId = process.env.COPY_TARGET_USER_ID ?? process.env.SEED_USER_ID
const cutoffDate = process.env.COPY_CUTOFF_DATE ?? '2026-04-30'
const copyPhotos = process.env.COPY_PHOTOS === 'true'

if (!supabaseUrl) die('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!serviceRoleKey) die('Missing SUPABASE_SERVICE_ROLE_KEY')
if (!sourceEmail) die('Missing COPY_SOURCE_EMAIL')
if (!targetUserId) die('Missing COPY_TARGET_USER_ID or SEED_USER_ID')

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const sourceUser = await findUserByEmail(sourceEmail)
if (!sourceUser) die(`Source user not found: ${sourceEmail}`)

const { data: entries, error: selectError } = await supabase
  .from('entries')
  .select('id, title, content, mood, date, created_at, updated_at, embedding, photos')
  .eq('user_id', sourceUser.id)
  .lte('date', cutoffDate)
  .order('date', { ascending: true })

if (selectError) die(`Select failed: ${selectError.message}`)
if (!entries?.length) {
  console.log(`No entries to copy for ${sourceEmail} up to ${cutoffDate}`)
  process.exit(0)
}

const copiedRows = entries.map(entry => ({
  id: `copy-${targetUserId.slice(0, 8)}-${entry.id}`,
  title: entry.title,
  content: entry.content,
  mood: entry.mood,
  date: entry.date,
  created_at: entry.created_at,
  updated_at: entry.updated_at,
  user_id: targetUserId,
  embedding: entry.embedding,
  photos: copyPhotos ? entry.photos ?? [] : [],
  strapi_id: null,
}))

const { error: upsertError } = await supabase
  .from('entries')
  .upsert(copiedRows, { onConflict: 'id' })

if (upsertError) die(`Upsert failed: ${upsertError.message}`)

console.log({
  sourceEmail,
  sourceUserId: sourceUser.id,
  targetUserId,
  cutoffDate,
  copied: copiedRows.length,
  copiedPhotos: copyPhotos,
})

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

async function findUserByEmail(email) {
  const wanted = email.toLowerCase()

  for (let page = 1; page <= 100; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) die(`Could not list auth users: ${error.message}`)

    const match = data.users.find(user => user.email?.toLowerCase() === wanted)
    if (match) return match
    if (data.users.length < 1000) return null
  }

  die('Too many auth users to scan safely. Set COPY_SOURCE_USER_ID and adapt the script.')
}
