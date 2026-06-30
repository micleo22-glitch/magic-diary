import { supabase } from './supabase'
import { Entry } from '@/types/entry'

function genId(): string {
  return crypto.randomUUID()
}

async function triggerEmbedding(id: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return
    fetch('/api/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {})
  } catch { /* ignore */ }
}

async function cmsFetch(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'CMS request failed')
  return data
}

export async function getEntries(): Promise<Entry[]> {
  try {
    const data = await cmsFetch('/api/cms/entries')
    return data.entries ?? []
  } catch (error) {
    console.error(error)
    return []
  }
}

export async function createEntry(
  data: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Entry> {
  const res = await cmsFetch('/api/cms/entries', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (res.entry?.id) triggerEmbedding(res.entry.id)
  return res.entry
}

export async function updateEntry(
  id: string,
  changes: Partial<Omit<Entry, 'id' | 'createdAt'>>
): Promise<Entry | null> {
  const res = await cmsFetch('/api/cms/entries', {
    method: 'PUT',
    body: JSON.stringify({ id, ...changes }),
  })
  if (changes.title !== undefined || changes.content !== undefined) {
    triggerEmbedding(id)
  }
  return res.entry
}

export async function deleteEntry(id: string): Promise<void> {
  await cmsFetch(`/api/cms/entries?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function getEntry(id: string): Promise<Entry | undefined> {
  const entries = await getEntries()
  return entries.find(entry => entry.id === id)
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
