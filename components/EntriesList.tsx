'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, BookOpen, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Entry, MOOD_EMOJI } from '@/types/entry'
import { EntryCard } from './EntryCard'

type Sort = 'newest' | 'oldest' | 'mood'

const PL_MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
  'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']

const SORT_KEY = 'magic_diary_sort'

interface EntriesListProps {
  entries: Entry[]
  selectedEntryId?: string | null
  onSelectEntry: (id: string) => void
  onNewEntry: () => void
  onEntryDeleted: () => void
}

export function EntriesList({
  entries, selectedEntryId, onSelectEntry, onNewEntry, onEntryDeleted,
}: EntriesListProps) {
  const [q, setQ] = useState('')
  const [moodFilter, setMoodFilter] = useState<number | null>(null)
  const [sort, setSort] = useState<Sort>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(SORT_KEY) as Sort) || 'newest'
    }
    return 'newest'
  })

  useEffect(() => {
    localStorage.setItem(SORT_KEY, sort)
  }, [sort])

  // Month navigation — default to current month
  const now = new Date()
  const [monthOffset, setMonthOffset] = useState(0)

  const activeYear  = now.getFullYear() + Math.floor((now.getMonth() + monthOffset) / 12)
  const activeMonth = ((now.getMonth() + monthOffset) % 12 + 12) % 12

  // Months that have entries (for dot indicator)
  const monthsWithEntries = useMemo(() => {
    const set = new Set<string>()
    entries.forEach(e => set.add(e.date.slice(0, 7)))
    return set
  }, [entries])

  const activeKey = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}`

  const entriesInMonth = entries.filter(e => e.date.startsWith(activeKey))

  const filtered = entriesInMonth
    .filter(e => moodFilter === null || e.mood === moodFilter)
    .filter(e => !q || e.title.toLowerCase().includes(q.toLowerCase()) ||
      e.content.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'newest') return +new Date(b.createdAt) - +new Date(a.createdAt)
      if (sort === 'oldest') return +new Date(a.createdAt) - +new Date(b.createdAt)
      return (b.mood ?? 0) - (a.mood ?? 0)
    })

  const sortLabels: Record<Sort, string> = { newest: 'Najnowsze', oldest: 'Najstarsze', mood: 'Nastrój' }

  // Moods present in current month for filter
  const moodsInMonth = useMemo(() => {
    const set = new Set<number>()
    entriesInMonth.forEach(e => { if (e.mood) set.add(e.mood) })
    return set
  }, [entriesInMonth])

  const entryCountLabel = () => {
    const n = entriesInMonth.length
    if (n === 0) return null
    if (n === 1) return '1 wpis'
    if (n < 5) return `${n} wpisy`
    return `${n} wpisów`
  }

  return (
    <div className="flex flex-col h-full parchment-bg">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 border-b border-[rgba(201,169,110,0.2)]">
        <h1 style={{ fontFamily: "'Playfair Display', serif" }}
          className="text-[#C9993F] text-3xl font-bold text-center mb-1">
          Spis Wspomnień
        </h1>
        <div className="flex justify-center mb-4">
          <div className="h-px w-28"
            style={{ background: 'linear-gradient(to right, transparent, rgba(201,153,63,0.5), transparent)' }} />
        </div>

        {/* Month navigator */}
        <div className="flex items-center justify-between mb-1 px-1">
          <button
            onClick={() => setMonthOffset(o => o - 1)}
            className="p-1.5 rounded-lg hover:bg-[rgba(201,153,63,0.12)] transition-colors"
            style={{ color: '#7A5C42' }}
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex flex-col items-center gap-0.5">
            <span style={{ fontFamily: "'IM Fell English SC', serif", fontSize: 18, color: '#C9993F', letterSpacing: '0.06em' }}>
              {PL_MONTHS[activeMonth]}
            </span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: 'rgba(201,153,63,0.5)', letterSpacing: '0.1em' }}>
              {activeYear}
            </span>
            {monthsWithEntries.has(activeKey) && (
              <div className="w-1 h-1 rounded-full bg-[#C9993F] mt-0.5" />
            )}
          </div>

          <button
            onClick={() => setMonthOffset(o => o + 1)}
            disabled={monthOffset >= 0}
            className="p-1.5 rounded-lg hover:bg-[rgba(201,153,63,0.12)] transition-colors disabled:opacity-30 disabled:cursor-default"
            style={{ color: '#7A5C42' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Entry count */}
        {entryCountLabel() && (
          <p className="text-center mb-3"
            style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: 'rgba(201,153,63,0.45)', letterSpacing: '0.1em' }}>
            {entryCountLabel()}
          </p>
        )}

        {/* Mood filter */}
        {moodsInMonth.size > 0 && (
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {([5, 4, 3, 2, 1] as const).filter(m => moodsInMonth.has(m)).map(m => (
              <button
                key={m}
                onClick={() => setMoodFilter(moodFilter === m ? null : m)}
                title={`Filtruj: ${MOOD_EMOJI[m]}`}
                className="w-8 h-8 rounded-full flex items-center justify-center text-base transition-all duration-150"
                style={{
                  background: moodFilter === m ? 'rgba(201,153,63,0.25)' : 'rgba(201,153,63,0.08)',
                  border: moodFilter === m ? '1.5px solid rgba(201,153,63,0.6)' : '1.5px solid transparent',
                  transform: moodFilter === m ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                {MOOD_EMOJI[m]}
              </button>
            ))}
            {moodFilter !== null && (
              <button
                onClick={() => setMoodFilter(null)}
                className="ml-1 px-2 py-0.5 rounded-full text-[10px] transition-colors"
                style={{
                  fontFamily: "'Cinzel', serif",
                  color: 'rgba(201,153,63,0.6)',
                  background: 'rgba(201,153,63,0.08)',
                  letterSpacing: '0.06em',
                }}
              >
                Wyczyść
              </button>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A5C42]" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Szukaj wspomnień..."
            style={{ fontFamily: "'Lora', serif", fontSize: 16 }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#E8DCC0] border border-[rgba(201,169,110,0.3)] text-[#1A0A06] placeholder:text-[#7A5C42]/70 outline-none focus:border-[#C9993F] transition-colors"
          />
        </div>

        {/* Sort pills */}
        <div className="flex gap-1.5">
          {(Object.keys(sortLabels) as Sort[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              style={{ fontFamily: "'Cinzel', serif", fontSize: 12 }}
              className={[
                'px-3 py-1.5 rounded-full tracking-wide transition-all',
                sort === s ? 'bg-[#C9993F] text-white' : 'bg-[#E8DCC0] text-[#5C3D28] hover:bg-[#C9993F]/20',
              ].join(' ')}
            >
              {sortLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 md:pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-4">
            <BookOpen size={44} className="text-[#C9993F]/30" />
            <p style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-[#7A5C42] text-center italic text-sm leading-relaxed">
              {q || moodFilter
                ? 'Nie znaleziono wspomnień\npasujących do filtrów.'
                : entriesInMonth.length === 0
                  ? 'W tym miesiącu nie ma jeszcze\nżadnych wpisów.'
                  : 'Brak wyników.'}
            </p>
            {!q && !moodFilter && entriesInMonth.length === 0 && (
              <button
                onClick={onNewEntry}
                style={{ fontFamily: "'Cinzel', serif", fontSize: 11 }}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#C9993F] text-white rounded-xl uppercase tracking-widest hover:bg-[#F0C96A] transition-colors"
              >
                <Plus size={14} />
                Napisz wpis
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <EntryCard
                  entry={entry}
                  isSelected={selectedEntryId === entry.id}
                  onClick={() => onSelectEntry(entry.id)}
                  onDeleted={onEntryDeleted}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
