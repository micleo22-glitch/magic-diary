import { supabase } from './supabase'
import { Entry } from '@/types/entry'

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEntry(row: any): Entry {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    mood: row.mood,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getEntries(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) { console.error(error); return [] }
  return (data ?? []).map(rowToEntry)
}

export async function createEntry(
  data: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Entry> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const now = new Date().toISOString()
  const row = {
    id: genId(),
    title: data.title,
    content: data.content,
    mood: data.mood,
    date: data.date,
    created_at: now,
    updated_at: now,
    user_id: user.id,
  }
  const { data: inserted, error } = await supabase
    .from('entries')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return rowToEntry(inserted)
}

export async function updateEntry(
  id: string,
  changes: Partial<Omit<Entry, 'id' | 'createdAt'>>
): Promise<Entry | null> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (changes.title !== undefined) patch.title = changes.title
  if (changes.content !== undefined) patch.content = changes.content
  if (changes.mood !== undefined) patch.mood = changes.mood
  if (changes.date !== undefined) patch.date = changes.date

  const { data, error } = await supabase
    .from('entries')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) { console.error(error); return null }
  return rowToEntry(data)
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from('entries').delete().eq('id', id)
  if (error) console.error(error)
}

export async function getEntry(id: string): Promise<Entry | undefined> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return undefined
  return rowToEntry(data)
}

// ── Chat messages ──────────────────────────────────────────────

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: string
}

export async function getChatMessages(entryId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('entry_id', entryId)
    .order('created_at', { ascending: true })
  if (error) { console.error(error); return [] }
  return (data ?? []).map(row => ({
    id: row.id,
    role: row.role,
    text: row.text,
    createdAt: row.created_at,
  }))
}

export async function saveChatMessage(
  entryId: string,
  role: 'user' | 'assistant',
  text: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase.from('chat_messages').insert({
    id: genId(),
    entry_id: entryId,
    user_id: user.id,
    role,
    text,
    created_at: new Date().toISOString(),
  })
  if (error) console.error(error)
}

export async function clearChatMessages(entryId: string): Promise<void> {
  const { error } = await supabase.from('chat_messages').delete().eq('entry_id', entryId)
  if (error) console.error(error)
}
