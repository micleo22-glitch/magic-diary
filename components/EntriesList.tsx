'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, BookOpen, Plus, ChevronLeft, ChevronRight, Heart, Camera, SlidersHorizontal } from 'lucide-react'
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
  onToggleFavorite: (id: string) => void
  loading?: boolean
}

const RECENT_COUNT = 5

export function EntriesList({
  entries, selectedEntryId, onSelectEntry, onNewEntry, onEntryDeleted, onToggleFavorite,
  loading = false,
}: EntriesListProps) {
  // 'recent' = clean default (5 latest, no filters); 'all' = full search + filters.
  const [mode, setMode] = useState<'recent' | 'all'>('recent')
  const [q, setQ] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => { searchRef.current?.blur() }, [])
  const [moodFilter, setMoodFilter] = useState<number | null>(null)
  const [favOnly, setFavOnly] = useState(false)
  const [photosOnly, setPhotosOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
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

  const baseEntries = (favOnly || photosOnly)
    ? entries.filter(e =>
        (!favOnly || e.isFavorite) &&
        (!photosOnly || (e.photos && e.photos.length > 0))
      )
    : entriesInMonth

  const filtered = baseEntries
    .filter(e => moodFilter === null || e.mood === moodFilter)
    .filter(e => !q || e.title.toLowerCase().includes(q.toLowerCase()) ||
      e.content.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'newest') return +new Date(b.createdAt) - +new Date(a.createdAt)
      if (sort === 'oldest') return +new Date(a.createdAt) - +new Date(b.createdAt)
      return (b.mood ?? 0) - (a.mood ?? 0)
    })

  const sortLabels: Record<Sort, string> = { newest: 'Najnowsze', oldest: 'Najstarsze', mood: 'Nastrój' }

  // Moods present in active base for filter
  const moodsInMonth = useMemo(() => {
    const set = new Set<number>()
    baseEntries.forEach(e => { if (e.mood) set.add(e.mood) })
    return set
  }, [baseEntries])

  // Any non-default list control → show a dot on the collapsed "Filtry" toggle.
  const filtersActive = sort !== 'newest' || moodFilter !== null || favOnly || photosOnly || monthOffset !== 0

  const entryCountLabel = () => {
    const n = entriesInMonth.length
    if (n === 0) return null
    if (n === 1) return '1 wpis'
    if (n < 5) return `${n} wpisy`
    return `${n} wpisów`
  }

  // 5 latest overall, for the clean default view.
  const recentEntries = useMemo(
    () => [...entries].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, RECENT_COUNT),
    [entries],
  )

  const renderCards = (items: Entry[]) => (
    <div className="flex flex-col gap-3.5">
      {items.map((entry, i) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i, 6) * 0.04 }}
        >
          <EntryCard
            entry={entry}
            isSelected={selectedEntryId === entry.id}
            onClick={() => onSelectEntry(entry.id)}
            onDeleted={onEntryDeleted}
            onToggleFavorite={() => onToggleFavorite(entry.id)}
          />
        </motion.div>
      ))}
    </div>
  )

  const skeleton = (
    <div className="flex flex-col gap-3.5" aria-hidden="true">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl p-4 shimmer" style={{ background: 'rgba(245,237,216,0.7)' }}>
          <div className="h-4 w-2/3 rounded mb-2" style={{ background: 'rgba(122,92,66,0.18)' }} />
          <div className="h-3 w-1/3 rounded mb-3" style={{ background: 'rgba(122,92,66,0.12)' }} />
          <div className="h-3 w-full rounded mb-1.5" style={{ background: 'rgba(122,92,66,0.10)' }} />
          <div className="h-3 w-4/5 rounded" style={{ background: 'rgba(122,92,66,0.10)' }} />
        </div>
      ))}
    </div>
  )

  // Warm empty state (no entries at all yet).
  const emptyWelcome = (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <BookOpen size={48} className="text-[#C9993F]/35" />
      <div>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#7A5C42' }}>
          Twój pamiętnik czeka na pierwszy wpis
        </p>
        <p style={{ fontFamily: "'Lora', serif", fontSize: 14, color: 'rgba(122,92,66,0.85)' }} className="mt-1 italic">
          Zapisz, co dziś przeżyłeś — choćby jedno zdanie.
        </p>
      </div>
      <button
        onClick={onNewEntry}
        style={{ fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}
        className="flex items-center gap-2 px-6 py-3 bg-[#C9993F] text-white rounded-xl hover:bg-[#D4A84A] active:scale-[0.98] transition-all"
      >
        <Plus size={15} />
        Napisz pierwszy wpis
      </button>
    </div>
  )

  return (
    <div className="flex flex-col h-full parchment-bg">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 border-b border-[rgba(201,169,110,0.2)]">
        <h1 style={{ fontFamily: "'Playfair Display', serif" }}
          className="text-[#C9993F] text-3xl font-bold text-center mb-1">
          Spis Wspomnień
        </h1>
        <div className="flex justify-center mb-6">
          <div className="h-px w-28"
            style={{ background: 'linear-gradient(to right, transparent, rgba(201,153,63,0.5), transparent)' }} />
        </div>

        {mode === 'all' && (
        <>
        {/* Back to recent */}
        <button
          onClick={() => setMode('recent')}
          aria-label="Wróć do ostatnich wpisów"
          className="flex items-center gap-1 mb-3 text-[#7A5C42] hover:text-[#C9993F] transition-colors active:scale-95"
          style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}
        >
          <ChevronLeft size={14} />
          Ostatnie wpisy
        </button>

        {/* Search + Filtry toggle — one row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A5C42]" />
            <input
              ref={searchRef}
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Szukaj wspomnień..."
              style={{ fontFamily: "'Lora', serif", fontSize: 16, fontWeight: 500 }}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#E8DCC0] border border-[rgba(201,169,110,0.3)] text-[#1A0A06] placeholder:text-[#7A5C42]/70 outline-none focus:border-[#C9993F] transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            aria-expanded={showFilters}
            aria-label="Filtry i sortowanie"
            className={[
              'relative flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl border transition-all active:scale-95',
              showFilters
                ? 'bg-[#C9993F] text-white border-[#C9993F]'
                : 'bg-[#E8DCC0] text-[#5C3D28] border-[rgba(201,169,110,0.3)] hover:bg-[#C9993F]/15',
            ].join(' ')}
          >
            <SlidersHorizontal size={17} />
            {filtersActive && !showFilters && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C9993F]"
                style={{ boxShadow: '0 0 0 2px #F5EDD8' }} />
            )}
          </button>
        </div>

        {/* Collapsible filters */}
        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              key="mobile-filters"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
            <div className="pt-3">

        {/* Month navigator */}
        <div className={`flex items-center justify-between mb-1 px-1 transition-opacity duration-200 ${favOnly || photosOnly ? 'opacity-30 pointer-events-none' : ''}`}>
          <button
            onClick={() => setMonthOffset(o => o - 1)}
            aria-label="Poprzedni miesiąc"
            className="p-2 rounded-lg hover:bg-[rgba(201,153,63,0.12)] transition-colors active:scale-90"
            style={{ color: '#7A5C42' }}
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex flex-col items-center gap-0.5">
            <span style={{ fontFamily: "'IM Fell English SC', serif", fontSize: 18, color: '#C9993F', letterSpacing: '0.06em', fontWeight: 700 }}>
              {PL_MONTHS[activeMonth]}
            </span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: 'rgba(201,153,63,0.65)', letterSpacing: '0.1em', fontWeight: 700 }}>
              {activeYear}
            </span>
            {monthsWithEntries.has(activeKey) && (
              <div className="w-1 h-1 rounded-full bg-[#C9993F] mt-0.5" />
            )}
          </div>

          <button
            onClick={() => setMonthOffset(o => o + 1)}
            disabled={monthOffset >= 0}
            aria-label="Następny miesiąc"
            className="p-2 rounded-lg hover:bg-[rgba(201,153,63,0.12)] transition-colors disabled:opacity-30 disabled:cursor-default active:scale-90"
            style={{ color: '#7A5C42' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Entry count */}
        {entryCountLabel() && (
          <p className="text-center mb-3"
            style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: 'rgba(201,153,63,0.65)', letterSpacing: '0.1em', fontWeight: 700 }}>
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
                aria-label={`Filtruj nastrój: ${MOOD_EMOJI[m]}`}
                aria-pressed={moodFilter === m}
                className="w-10 h-10 rounded-full flex items-center justify-center text-base transition-all duration-150"
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
                className="ml-1 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-150 hover:scale-110"
                title="Wyczyść filtr"
                aria-label="Wyczyść filtr nastroju"
                style={{
                  background: 'rgba(201,153,63,0.2)',
                  border: '1.5px solid rgba(201,153,63,0.5)',
                  color: '#C9993F',
                }}
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Sort pills — row 1 */}
        <div className="flex gap-1.5 justify-center mb-1.5">
          {(Object.keys(sortLabels) as Sort[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              style={{ fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 700 }}
              className={[
                'px-3 py-1.5 rounded-full tracking-wide transition-all',
                sort === s ? 'bg-[#C9993F] text-white' : 'bg-[#E8DCC0] text-[#5C3D28] hover:bg-[#C9993F]/20',
              ].join(' ')}
            >
              {sortLabels[s]}
            </button>
          ))}
        </div>

        {/* Filter pills — row 2 */}
        <div className="flex gap-1.5 justify-center">
          <button
            onClick={() => setFavOnly(v => !v)}
            style={{ fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 700 }}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full tracking-wide transition-all',
              favOnly ? 'bg-[#C9993F] text-white' : 'bg-[#E8DCC0] text-[#5C3D28] hover:bg-[#C9993F]/20',
            ].join(' ')}
          >
            <Heart size={11} fill={favOnly ? 'currentColor' : 'none'} />
            Ulubione
          </button>
          <button
            onClick={() => setPhotosOnly(v => !v)}
            style={{ fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 700 }}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full tracking-wide transition-all',
              photosOnly ? 'bg-[#C9993F] text-white' : 'bg-[#E8DCC0] text-[#5C3D28] hover:bg-[#C9993F]/20',
            ].join(' ')}
          >
            <Camera size={11} />
            Ze zdjęciem
          </button>
        </div>
            </div>
            </motion.div>
          )}
        </AnimatePresence>
        </>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-32 md:pb-5">
        {loading ? (
          skeleton
        ) : mode === 'recent' ? (
          recentEntries.length === 0 ? (
            emptyWelcome
          ) : (
            <>
              {renderCards(recentEntries)}
              {entries.length > RECENT_COUNT && (
                <button
                  onClick={() => setMode('all')}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-[rgba(201,153,63,0.3)] text-[#C9993F] hover:bg-[#C9993F]/10 active:scale-[0.99] transition-all"
                  style={{ fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}
                >
                  Zobacz wszystkie wpisy ({entries.length})
                  <ChevronRight size={15} />
                </button>
              )}
            </>
          )
        ) : (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <BookOpen size={44} className="text-[#C9993F]/30" />
              <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600 }}
                className="text-[#7A5C42] text-center italic text-sm leading-relaxed">
                {favOnly && photosOnly
                  ? 'Brak ulubionych wpisów ze zdjęciem.'
                  : favOnly
                    ? 'Nie masz jeszcze ulubionych wpisów.'
                    : photosOnly
                      ? 'Brak wpisów ze zdjęciem.'
                      : q || moodFilter
                        ? 'Nie znaleziono wspomnień pasujących do filtrów.'
                        : 'W tym miesiącu nie ma jeszcze żadnych wpisów.'}
              </p>
            </div>
          ) : (
            renderCards(filtered)
          )
        )}
      </div>
    </div>
  )
}
