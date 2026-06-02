export interface Entry {
  id: string
  title: string
  content: string // HTML from TipTap
  mood: 1 | 2 | 3 | 4 | 5 | null
  date: string // ISO 8601: "2026-05-28"
  createdAt: string // ISO 8601 timestamp
  updatedAt: string // ISO 8601 timestamp
}

export const MOOD_DATA: { value: number; emoji: string; label: string }[] = [
  { value: 5, emoji: '✨', label: 'Świetnie!' },
  { value: 4, emoji: '🙂', label: 'Dobrze' },
  { value: 3, emoji: '😐', label: 'Neutralnie' },
  { value: 2, emoji: '😔', label: 'Źle' },
  { value: 1, emoji: '🌑', label: 'Koszmarnie' },
]

export const MOOD_EMOJI: Record<number, string> = {
  5: '✨', 4: '🙂', 3: '😐', 2: '😔', 1: '🌑',
}

export const MOOD_LABEL: Record<number, string> = {
  5: 'Świetnie!', 4: 'Dobrze', 3: 'Neutralnie', 2: 'Źle', 1: 'Koszmarnie',
}
