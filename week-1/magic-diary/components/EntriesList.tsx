'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, BookOpen, Plus } from 'lucide-react'
import { Entry } from '@/types/entry'
import { EntryCard } from './EntryCard'

type Sort = 'newest' | 'oldest' | 'mood'

const MONTHS_SHORT = [
  'Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze',
  'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru',
]

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
  const [sort, setSort] = useState<Sort>('newest')
  const [monthFilter, setMonthFilter] = useState<string | null>(null)

  const sortLabels: Record<Sort, string> = {
    newest: 'Najnowsze',
    oldest: 'Najstarsze',
    mood: 'Nastrój',
  }

  // Dostępne miesiące — na podstawie dat wpisów
  const availableMonths = useMemo(() => {
    const map = new Map<string, { year: number; month: number; label: string }>()
    entries.forEach(e => {
      const d = new Date(e.date + 'T00:00:00')
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map.has(key)) {
        map.set(key, {
          year: d.getFullYear(),
          month: d.getMonth(),
          label: `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`,
        })
      }
    })
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, val]) => ({ key, ...val }))
  }, [entries])

  const filtered = entries
    .filter(e => {
      // Filtr miesiąca
      if (monthFilter) {
        const d = new Date(e.date + 'T00:00:00')
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (key !== monthFilter) return false
      }
      // Szukaj
      return !q ||
        e.title.toLowerCase().includes(q.toLowerCase()) ||
        e.content.toLowerCase().includes(q.toLowerCase())
    })
    .sort((a, b) => {
      if (sort === 'newest') return +new Date(b.createdAt) - +new Date(a.createdAt)
      if (sort === 'oldest') return +new Date(a.createdAt) - +new Date(b.createdAt)
      return (b.mood ?? 0) - (a.mood ?? 0)
    })

  return (
    <div className="flex flex-col h-full parchment-bg">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 border-b border-[rgba(201,169,110,0.2)]">
        <h1
          style={{ fontFamily: "'Playfair Display', serif" }}
          className="text-[#C9993F] text-3xl font-bold text-center mb-1"
        >
          Spis Wspomnień
        </h1>
        <div className="flex justify-center mb-4">
          <div
            className="h-px w-28"
            style={{ background: 'linear-gradient(to right, transparent, rgba(201,153,63,0.5), transparent)' }}
          />
        </div>

        {/* Szukaj */}
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

        {/* Sortowanie */}
        <div className="flex gap-1.5 mb-3">
          {(Object.keys(sortLabels) as Sort[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              style={{ fontFamily: "'Cinzel', serif", fontSize: 12 }}
              className={[
                'px-3 py-1.5 rounded-full tracking-wide transition-all',
                sort === s
                  ? 'bg-[#C9993F] text-white'
                  : 'bg-[#E8DCC0] text-[#5C3D28] hover:bg-[#C9993F]/20',
              ].join(' ')}
            >
              {sortLabels[s]}
            </button>
          ))}
        </div>

        {/* Filtr miesiąc/rok */}
        {availableMonths.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            <button
              onClick={() => setMonthFilter(null)}
              style={{ fontFamily: "'Cinzel', serif", fontSize: 11 }}
              className={[
                'flex-shrink-0 px-3 py-1.5 rounded-full tracking-wide transition-all',
                monthFilter === null
                  ? 'bg-[#5C3D28] text-[#F0C96A]'
                  : 'bg-[#E8DCC0] text-[#5C3D28] hover:bg-[#C9993F]/20',
              ].join(' ')}
            >
              Wszystkie
            </button>
            {availableMonths.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setMonthFilter(key === monthFilter ? null : key)}
                style={{ fontFamily: "'Cinzel', serif", fontSize: 11 }}
                className={[
                  'flex-shrink-0 px-3 py-1.5 rounded-full tracking-wide transition-all whitespace-nowrap',
                  monthFilter === key
                    ? 'bg-[#5C3D28] text-[#F0C96A]'
                    : 'bg-[#E8DCC0] text-[#5C3D28] hover:bg-[#C9993F]/20',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 md:pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-4">
            <BookOpen size={44} className="text-[#C9993F]/30" />
            <p
              style={{ fontFamily: "'Playfair Display', serif" }}
              className="text-[#7A5C42] text-center italic text-sm leading-relaxed"
            >
              {q || monthFilter
                ? 'Nie znaleziono wspomnień\npasujących do filtrów.'
                : 'Twoja księga jest pusta.\nCzas na pierwszy wpis!'}
            </p>
            {!q && !monthFilter && (
              <button
                onClick={onNewEntry}
                style={{ fontFamily: "'Cinzel', serif", fontSize: 11 }}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#C9993F] text-white rounded-xl uppercase tracking-widest hover:bg-[#F0C96A] transition-colors"
              >
                <Plus size={14} />
                Napisz pierwszy wpis
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
