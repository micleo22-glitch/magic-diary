'use client'

import { useState } from 'react'
import { Feather, Search, User, GraduationCap, ShoppingBag, Settings, LogOut, ChevronRight } from 'lucide-react'
import { Entry, MOOD_EMOJI } from '@/types/entry'

function fmtShort(iso: string): string {
  const d = new Date(iso)
  const months = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
    'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

function getInitials(email: string): string {
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

interface SidebarProps {
  entries: Entry[]
  selectedEntryId: string | null
  onSelectEntry: (id: string) => void
  onNewEntry: () => void
  userEmail: string
  onLogout: () => void
}

const NAV_ITEMS = [
  { icon: User,          label: 'Profil' },
  { icon: GraduationCap, label: 'Nauczyciel' },
  { icon: ShoppingBag,   label: 'Sklep' },
  { icon: Settings,      label: 'Ustawienia' },
]

export function Sidebar({ entries, selectedEntryId, onSelectEntry, onNewEntry, userEmail, onLogout }: SidebarProps) {
  const [q, setQ] = useState('')

  const filtered = entries.filter(e =>
    !q || e.title.toLowerCase().includes(q.toLowerCase()) ||
    e.content.toLowerCase().includes(q.toLowerCase())
  )

  const initials = getInitials(userEmail)
  const displayName = userEmail.split('@')[0]

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'linear-gradient(180deg, #2C0F0A 0%, #220B08 100%)' }}
    >
      {/* ── User profile ── */}
      <div className="px-4 pt-5 pb-4 border-b border-[rgba(201,169,110,0.12)]">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #C9993F 0%, #8B5E2A 100%)',
              border: '2px solid rgba(201,153,63,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Cinzel', serif", fontSize: 15, color: '#1A0A06', fontWeight: 600,
              boxShadow: '0 0 12px rgba(201,153,63,0.2)',
            }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: '#C9993F', letterSpacing: '0.05em' }}
              className="truncate capitalize">
              {displayName}
            </p>
            <p style={{ fontFamily: "'Lora', serif", fontSize: 10, color: 'rgba(201,153,63,0.4)' }}
              className="truncate">
              {userEmail}
            </p>
          </div>
        </div>
      </div>

      {/* ── Nav items ── */}
      <div className="px-2 py-2 border-b border-[rgba(201,169,110,0.12)]">
        {NAV_ITEMS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group hover:bg-[rgba(201,153,63,0.08)]"
          >
            <div className="flex items-center gap-2.5">
              <Icon size={14} style={{ color: 'rgba(201,153,63,0.5)' }} />
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: 'rgba(201,153,63,0.7)', letterSpacing: '0.06em' }}>
                {label}
              </span>
            </div>
            <ChevronRight size={12} style={{ color: 'rgba(201,153,63,0.25)' }} />
          </button>
        ))}
      </div>

      {/* ── Nowy Wpis ── */}
      <div className="px-4 pt-4 pb-3">
        <button
          onClick={onNewEntry}
          style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 14, fontWeight: 500 }}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#C9993F] rounded-xl text-[#1A0A06] hover:bg-[#D4A84A] active:scale-[0.98] transition-all shadow-md"
        >
          <Feather size={14} />
          Nowy Wpis
        </button>
      </div>

      {/* ── Search ── */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7A5C42]" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Szukaj..."
            style={{ fontFamily: "'Lora', serif", fontSize: 13, background: 'rgba(255,255,255,0.04)' }}
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-[rgba(201,169,110,0.15)] text-[#D4A96A] placeholder:text-[#7A5C42]/60 outline-none focus:border-[#C9993F]/40 transition-colors"
          />
        </div>
      </div>

      {/* ── Spis Wspomnień label ── */}
      <div className="border-t border-[rgba(201,169,110,0.12)] pt-3 pb-1.5 px-4 text-center">
        <span style={{ fontFamily: "'IM Fell English SC', serif", color: '#C9993F', fontSize: 13, letterSpacing: '0.08em' }}>
          Spis Wspomnień
        </span>
      </div>

      {/* ── Entries scroll ── */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <p style={{ fontFamily: "'Lora', serif", color: '#7A5C42', fontSize: 12 }}
            className="italic text-center py-8 px-3">
            {q ? 'Brak wyników.' : 'Brak wpisów.'}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5 mt-1">
            {filtered.map(entry => {
              const sel = selectedEntryId === entry.id
              return (
                <button
                  key={entry.id}
                  onClick={() => onSelectEntry(entry.id)}
                  className="w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150"
                  style={{
                    background: sel ? 'rgba(201,153,63,0.15)' : 'transparent',
                  }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: '#9A7A5A' }} className="mb-0.5">
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

      {/* ── Wyloguj ── */}
      <button
        onClick={onLogout}
        className="flex items-center gap-2 px-5 py-3.5 border-t border-[rgba(201,169,110,0.1)] hover:bg-[rgba(201,153,63,0.06)] transition-colors"
        style={{ fontFamily: "'Cinzel', serif", color: 'rgba(201,153,63,0.4)', fontSize: 11, letterSpacing: '0.08em' }}
      >
        <LogOut size={13} />
        Wyloguj się
      </button>
    </div>
  )
}
