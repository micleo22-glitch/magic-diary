'use client'

import { useState } from 'react'
import { Feather, Search } from 'lucide-react'
import { Entry, MOOD_EMOJI } from '@/types/entry'

function fmtShort(iso: string): string {
  const d = new Date(iso)
  const months = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
    'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

interface SidebarProps {
  entries: Entry[]
  selectedEntryId: string | null
  onSelectEntry: (id: string) => void
  onNewEntry: () => void
}

export function Sidebar({ entries, selectedEntryId, onSelectEntry, onNewEntry }: SidebarProps) {
  const [q, setQ] = useState('')

  const filtered = entries.filter(e =>
    !q || e.title.toLowerCase().includes(q.toLowerCase()) ||
    e.content.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'linear-gradient(180deg, #2C0F0A 0%, #220B08 100%)' }}
    >
      {/* Logo area */}
      <div className="flex flex-col items-center pt-6 pb-4 border-b border-[rgba(201,169,110,0.1)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Magic Diary"
          width={72}
          height={72}
          style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 12px rgba(201,153,63,0.4))' }}
        />
        <span
          className="mt-2 tracking-widest uppercase"
          style={{ fontFamily: "'IM Fell English SC', serif", color: '#C9993F', fontSize: 15 }}
        >
          Magic Diary
        </span>
      </div>

      {/* New entry button */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={onNewEntry}
          style={{ fontFamily: "'Cinzel', serif", fontSize: 11 }}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#C9993F]/18 border border-[#C9993F]/28 rounded-xl text-[#C9993F] hover:bg-[#C9993F]/28 transition-all uppercase tracking-widest"
        >
          <Feather size={13} />
          Nowy Wpis
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7A5C42]" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Szukaj..."
            style={{ fontFamily: "'Lora', serif", fontSize: 12, background: 'rgba(255,255,255,0.04)' }}
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-[rgba(201,169,110,0.15)] text-[#D4A96A] placeholder:text-[#7A5C42]/60 outline-none focus:border-[#C9993F]/40 transition-colors"
          />
        </div>
      </div>

      {/* Section label */}
      <div className="px-4 pb-1">
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: '#7A5C42' }}
          className="uppercase tracking-widest">
          Spis Wspomnień
        </p>
      </div>

      {/* Entries scroll */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {filtered.length === 0 ? (
          <p style={{ fontFamily: "'Lora', serif", color: '#7A5C42', fontSize: 12 }}
            className="italic text-center py-8 px-3">
            {q ? 'Brak wyników.' : 'Brak wpisów.'}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map(entry => {
              const sel = selectedEntryId === entry.id
              return (
                <button
                  key={entry.id}
                  onClick={() => onSelectEntry(entry.id)}
                  className={[
                    'w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 border group',
                    sel
                      ? 'bg-[#C9993F]/18 border-[#C9993F]/35 border-l-2 border-l-[#C9993F]'
                      : 'border-transparent hover:bg-[#C9993F]/8 hover:border-l-2 hover:border-l-[#C9993F]/40',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: '#9A7A5A' }}
                        className="uppercase tracking-wider mb-0.5">
                        {fmtShort(entry.date)}
                      </p>
                      <p style={{ fontFamily: "'Playfair Display', serif" }}
                        className="text-[#E0B87A] text-base truncate leading-snug">
                        {entry.title || 'Bez tytułu'}
                      </p>
                    </div>
                    {entry.mood ? (
                      <span className="text-sm flex-shrink-0 mt-0.5">{MOOD_EMOJI[entry.mood]}</span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
