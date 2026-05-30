import { Entry } from '@/types/entry'

const ENTRIES_KEY = 'magic-diary:entries'

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function getEntries(): Entry[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(ENTRIES_KEY)
    return data ? (JSON.parse(data) as Entry[]) : []
  } catch {
    return []
  }
}

export function saveEntries(entries: Entry[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
}

export function createEntry(
  data: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>
): Entry {
  const entries = getEntries()
  const now = new Date().toISOString()
  const entry: Entry = { ...data, id: genId(), createdAt: now, updatedAt: now }
  saveEntries([entry, ...entries])
  return entry
}

export function updateEntry(
  id: string,
  changes: Partial<Omit<Entry, 'id' | 'createdAt'>>
): Entry | null {
  const entries = getEntries()
  const idx = entries.findIndex(e => e.id === id)
  if (idx === -1) return null
  const updated: Entry = {
    ...entries[idx],
    ...changes,
    updatedAt: new Date().toISOString(),
  }
  entries[idx] = updated
  saveEntries(entries)
  return updated
}

export function deleteEntry(id: string): void {
  saveEntries(getEntries().filter(e => e.id !== id))
}

export function getEntry(id: string): Entry | undefined {
  return getEntries().find(e => e.id === id)
}
