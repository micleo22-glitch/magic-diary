'use client'

import { useState, useMemo, useEffect } from 'react'
import { Feather, Search, User, GraduationCap, ShoppingBag, Settings, LogOut, ChevronRight, ChevronLeft, X } from 'lucide-react'
import { Entry, MOOD_EMOJI } from '@/types/entry'

const PL_MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
  'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']

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
  { icon: GraduationCap, label: 'Nauczyciele' },
  { icon: ShoppingBag,   label: 'Sklep' },
  { icon: Settings,      label: 'Ustawienia' },
]

const HOUSES = [
  { id: 'gryffindor', name: 'Gryffindor', emoji: '🦁', color: '#C41E3A', bg: 'rgba(196,30,58,0.15)' },
  { id: 'slytherin',  name: 'Slytherin',  emoji: '🐍', color: '#2EAD6E', bg: 'rgba(46,173,110,0.12)' },
  { id: 'hufflepuff', name: 'Hufflepuff', emoji: '🦡', color: '#ECB939', bg: 'rgba(236,185,57,0.15)' },
  { id: 'ravenclaw',  name: 'Ravenclaw',  emoji: '🦅', color: '#5B8DD9', bg: 'rgba(91,141,217,0.15)' },
]

export function Sidebar({ entries, selectedEntryId, onSelectEntry, onNewEntry, userEmail, onLogout }: SidebarProps) {
  const [q, setQ] = useState('')
  const [monthOffset, setMonthOffset] = useState(0)
  const [activeNav, setActiveNav] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [house, setHouse] = useState('')

  useEffect(() => {
    const savedName = localStorage.getItem('magic_diary_username')
    const savedHouse = localStorage.getItem('magic_diary_house')
    if (savedName) { setUsername(savedName); setUsernameInput(savedName) }
    if (savedHouse) setHouse(savedHouse)
  }, [])

  function saveUsername() {
    localStorage.setItem('magic_diary_username', usernameInput)
    setUsername(usernameInput)
  }

  function selectHouse(id: string) {
    localStorage.setItem('magic_diary_house', id)
    setHouse(id)
  }

  const now = new Date()
  const activeYear  = now.getFullYear() + Math.floor((now.getMonth() + monthOffset) / 12)
  const activeMonth = ((now.getMonth() + monthOffset) % 12 + 12) % 12
  const activeKey   = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}`

  const monthsWithEntries = useMemo(() => {
    const set = new Set<string>()
    entries.forEach(e => set.add(e.date.slice(0, 7)))
    return set
  }, [entries])

  const filtered = entries
    .filter(e => e.date.startsWith(activeKey))
    .filter(e =>
      !q || e.title.toLowerCase().includes(q.toLowerCase()) ||
      e.content.toLowerCase().includes(q.toLowerCase())
    )

  const initials = username ? username.slice(0, 2).toUpperCase() : getInitials(userEmail)
  const displayName = username || userEmail.split('@')[0]

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
          </div>
        </div>
      </div>

      {/* ── Nav items ── */}
      <div className="px-2 py-2 border-b border-[rgba(201,169,110,0.12)]">
        {NAV_ITEMS.map(({ icon: Icon, label }) => {
          const isActive = activeNav === label
          return (
            <button
              key={label}
              onClick={() => setActiveNav(label)}
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
          )
        })}
      </div>

      {/* ── Settings full-screen overlay ── */}
      {activeNav === 'Ustawienia' && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'linear-gradient(180deg, #2C0F0A 0%, #1A0A06 100%)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-[rgba(201,153,63,0.15)]">
            <div className="flex items-center gap-3">
              <Settings size={16} style={{ color: '#C9993F' }} />
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: '#C9993F', letterSpacing: '0.1em' }}>
                USTAWIENIA
              </span>
            </div>
            <button
              onClick={() => setActiveNav(null)}
              className="p-2 rounded-xl hover:bg-[rgba(201,153,63,0.1)] transition-colors"
              style={{ color: 'rgba(201,153,63,0.5)' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Settings list */}
          <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">

            {/* Nazwa użytkownika */}
            <div className="rounded-2xl border border-[rgba(201,153,63,0.15)]"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="px-4 pt-4 pb-5">
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: 'rgba(201,153,63,0.5)', letterSpacing: '0.12em' }}
                  className="mb-3 uppercase">Nazwa użytkownika</p>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveUsername()}
                  placeholder={userEmail.split('@')[0]}
                  style={{ fontFamily: "'Lora', serif", fontSize: 15, background: 'rgba(255,255,255,0.05)' }}
                  className="w-full px-4 py-3 rounded-xl border border-[rgba(201,153,63,0.2)] text-[#D4A96A] placeholder:text-[#7A5C42]/50 outline-none focus:border-[#C9993F]/50 transition-colors mb-3"
                />
                <button
                  onClick={saveUsername}
                  style={{ fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: '0.08em' }}
                  className="w-full py-3 rounded-xl bg-[#C9993F] text-[#1A0A06] font-semibold hover:bg-[#D4A84A] active:scale-[0.98] transition-all"
                >
                  Zapisz
                </button>
              </div>
            </div>

            {/* Wybór domu */}
            <div className="rounded-2xl border border-[rgba(201,153,63,0.15)]"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="px-4 pt-4 pb-5">
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: 'rgba(201,153,63,0.5)', letterSpacing: '0.12em' }}
                  className="mb-3 uppercase">Twój Dom</p>
                <div className="grid grid-cols-2 gap-2">
                  {HOUSES.map(h => {
                    const selected = house === h.id
                    return (
                      <button
                        key={h.id}
                        onClick={() => selectHouse(h.id)}
                        className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all active:scale-[0.97]"
                        style={{
                          borderColor: selected ? h.color : 'rgba(201,153,63,0.12)',
                          background: selected ? h.bg : 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <span style={{ fontSize: 26 }}>{h.emoji}</span>
                        <span style={{
                          fontFamily: "'Cinzel', serif", fontSize: 10,
                          color: selected ? h.color : 'rgba(201,153,63,0.55)',
                          letterSpacing: '0.06em',
                        }}>
                          {h.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

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

      {/* ── Month navigator ── */}
      <div className="flex items-center justify-between px-3 pb-2">
        <button
          onClick={() => setMonthOffset(o => o - 1)}
          className="p-1 rounded-lg hover:bg-[rgba(201,153,63,0.12)] transition-colors"
          style={{ color: '#7A5C42' }}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex flex-col items-center gap-0.5">
          <span style={{ fontFamily: "'IM Fell English SC', serif", fontSize: 13, color: '#C9993F', letterSpacing: '0.06em' }}>
            {PL_MONTHS[activeMonth]}
          </span>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: 'rgba(201,153,63,0.5)', letterSpacing: '0.1em' }}>
            {activeYear}
          </span>
          {monthsWithEntries.has(activeKey) && (
            <div className="w-1 h-1 rounded-full bg-[#C9993F]" />
          )}
        </div>

        <button
          onClick={() => setMonthOffset(o => o + 1)}
          disabled={monthOffset >= 0}
          className="p-1 rounded-lg hover:bg-[rgba(201,153,63,0.12)] transition-colors disabled:opacity-30 disabled:cursor-default"
          style={{ color: '#7A5C42' }}
        >
          <ChevronRight size={16} />
        </button>
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
