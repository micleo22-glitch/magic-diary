'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Feather, Search, User, GraduationCap, ShoppingBag, Settings,
  LogOut, ChevronRight, ChevronLeft, X, Download, Trash2, Mail, Heart, BookOpen,
} from 'lucide-react'
import { Entry, MOOD_EMOJI, MOOD_LABEL } from '@/types/entry'
import { HouseTheme, DEFAULT_THEME, streakLabel } from '@/lib/houseTheme'
import { toast } from '@/lib/toast'

const PL_MONTHS = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
  'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']

function fmtShort(iso: string): string {
  const d = new Date(iso)
  const months = ['sty','lut','mar','kwi','maj','cze','lip','sie','wrz','paź','lis','gru']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

function getInitials(email: string): string {
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function calcStreak(entries: Entry[]): number {
  if (!entries.length) return 0
  const dates = Array.from(new Set(entries.map(e => e.date))).sort().reverse()
  let streak = 0
  let cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  for (const d of dates) {
    const day = new Date(d)
    day.setHours(0, 0, 0, 0)
    const diff = Math.round((cursor.getTime() - day.getTime()) / 86400000)
    if (diff > 1) break
    streak++
    cursor = day
  }
  return streak
}

const HOUSES = [
  { id: 'gryffindor', name: 'Gryffindor', emoji: '🦁', color: '#C41E3A', bg: 'rgba(196,30,58,0.15)' },
  { id: 'slytherin',  name: 'Slytherin',  emoji: '🐍', color: '#2EAD6E', bg: 'rgba(46,173,110,0.12)' },
  { id: 'hufflepuff', name: 'Hufflepuff', emoji: '🦡', color: '#D4A017', bg: 'rgba(212,160,23,0.15)' },
  { id: 'ravenclaw',  name: 'Ravenclaw',  emoji: '🦅', color: '#5B8DD9', bg: 'rgba(91,141,217,0.15)' },
]

const NAV_ITEMS = [
  { icon: User,          label: 'Profil' },
  { icon: GraduationCap, label: 'Postacie' },
  { icon: ShoppingBag,   label: 'Sklep' },
  { icon: Settings,      label: 'Ustawienia' },
]

interface SidebarProps {
  entries: Entry[]
  selectedEntryId: string | null
  onSelectEntry: (id: string) => void
  onNewEntry: () => void
  onToggleFavorite: (id: string) => void
  userEmail: string
  username: string
  house: string
  theme?: HouseTheme
  onLogout: () => void
  onUsernameChange: (v: string) => void
  onHouseChange: (id: string) => void
  onExport: () => void
  onDeleteAll: () => void
}

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[rgba(201,153,63,0.15)]"
      style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="px-4 pt-4 pb-4">
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: 'rgba(201,153,63,0.95)', letterSpacing: '0.12em', fontWeight: 700 }}
          className="mb-3 uppercase">{label}</p>
        {children}
      </div>
    </div>
  )
}

export function Sidebar({
  entries, selectedEntryId, onSelectEntry, onNewEntry, onToggleFavorite,
  userEmail, username, house, theme = DEFAULT_THEME, onLogout,
  onUsernameChange, onHouseChange, onExport, onDeleteAll,
}: SidebarProps) {
  type Sort = 'newest' | 'oldest' | 'mood'
  const SORT_KEY = 'magic_diary_sort'

  const [q, setQ]                       = useState('')
  const sidebarSearchRef = useRef<HTMLInputElement>(null)
  useEffect(() => { sidebarSearchRef.current?.blur() }, [])
  const [monthOffset, setMonthOffset]   = useState(0)
  const [moodFilter, setMoodFilter]     = useState<number | null>(null)
  const [favOnly, setFavOnly]           = useState(false)
  const [sort, setSort]                 = useState<Sort>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem(SORT_KEY) as Sort) || 'newest'
    return 'newest'
  })
  const [activeNav, setActiveNav]       = useState<string | null>(null)
  const [localUsername, setLocalUsername] = useState(username)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)

  const now          = new Date()
  const todayIso     = now.toISOString().slice(0, 10)
  const activeYear   = now.getFullYear() + Math.floor((now.getMonth() + monthOffset) / 12)
  const activeMonth  = ((now.getMonth() + monthOffset) % 12 + 12) % 12
  const activeKey    = `${activeYear}-${String(activeMonth + 1).padStart(2, '0')}`
  const streak       = calcStreak(entries)
  const todayHasEntry = entries.some(e => e.date === todayIso)

  const monthsWithEntries = useMemo(() => {
    const set = new Set<string>()
    entries.forEach(e => set.add(e.date.slice(0, 7)))
    return set
  }, [entries])

  const entriesInMonth = entries.filter(e => e.date.startsWith(activeKey))

  const baseEntries = favOnly ? entries.filter(e => e.isFavorite) : entriesInMonth

  const moodsInMonth = useMemo(() => {
    const set = new Set<number>()
    baseEntries.forEach(e => { if (e.mood) set.add(e.mood) })
    return set
  }, [baseEntries])

  useEffect(() => { localStorage.setItem(SORT_KEY, sort) }, [sort])

  const sortLabels: Record<Sort, string> = { newest: 'Najnowsze', oldest: 'Najstarsze', mood: 'Nastrój' }

  const filtered = baseEntries
    .filter(e => moodFilter === null || e.mood === moodFilter)
    .filter(e => !q || e.title.toLowerCase().includes(q.toLowerCase()) ||
      e.content.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'newest') return +new Date(b.createdAt) - +new Date(a.createdAt)
      if (sort === 'oldest') return +new Date(a.createdAt) - +new Date(b.createdAt)
      return (b.mood ?? 0) - (a.mood ?? 0)
    })

  const houseData  = HOUSES.find(h => h.id === house)
  const initials   = username ? username.slice(0, 2).toUpperCase() : getInitials(userEmail)
  const displayName = username || userEmail.split('@')[0]

  function saveUsername() {
    const trimmed = localUsername.trim()
    if (!trimmed) return
    onUsernameChange(trimmed)
    toast('Nazwa zapisana', 'success')
  }

  // ─── Profile overlay ─────────────────────────────────────────
  function ProfileOverlay() {
    const topMoodEntry = (() => {
      const counts: Record<number, number> = {}
      entries.forEach(e => { if (e.mood) counts[e.mood] = (counts[e.mood] ?? 0) + 1 })
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      if (!top) return null
      const m = Number(top[0]) as 1|2|3|4|5
      return `${MOOD_EMOJI[m]} ${MOOD_LABEL[m]}`
    })()

    return (
      <div className="fixed inset-0 z-50 flex flex-col"
        style={{ background: theme.sidebarBg, transition: 'background 0.4s ease' }}>
        <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-[rgba(201,153,63,0.15)]">
          <div className="flex items-center gap-3">
            <User size={16} style={{ color: theme.primary }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: theme.primary, letterSpacing: '0.1em' }}>PROFIL</span>
          </div>
          <button onClick={() => setActiveNav(null)}
            className="p-2 rounded-xl hover:bg-[rgba(201,153,63,0.1)] transition-colors"
            style={{ color: 'rgba(201,153,63,0.85)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: houseData
                ? `linear-gradient(135deg, ${houseData.color}99 0%, ${houseData.color}44 100%)`
                : `linear-gradient(135deg, ${theme.primary}99 0%, ${theme.primary}44 100%)`,
              border: `2px solid ${houseData?.color ?? theme.primary}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Cinzel', serif", fontSize: 24, color: '#F5EDD8', fontWeight: 600,
            }}>
              {initials}
            </div>
            <div className="text-center">
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: theme.primary, fontWeight: 700 }}>{displayName}</p>
              {houseData && (
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: houseData.color, letterSpacing: '0.08em', fontWeight: 700 }}>
                  {houseData.emoji} {houseData.name}
                </p>
              )}
              {streak > 0 && (
                <p style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.06em', marginTop: 4,
                  color: todayHasEntry ? theme.primary : 'rgba(200,185,165,0.85)' }}>
                  <span style={{ opacity: todayHasEntry ? 1 : 0.6 }}>🔥</span> {streakLabel(streak)} z rzędu{!todayHasEntry ? ' · napisz dziś!' : ''}
                </p>
              )}
            </div>
          </div>

          <SectionCard label="Statystyki">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Wpisów',    value: entries.length.toString() },
                { label: 'Seria dni', value: streak > 0 ? `${streak} 🔥` : '—' },
                { label: 'Nastrój',   value: topMoodEntry ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl"
                  style={{ background: theme.primaryDim, border: `1px solid ${theme.borderColor}` }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8, color: 'rgba(201,153,63,0.9)', letterSpacing: '0.1em', fontWeight: 700 }}>
                    {label.toUpperCase()}
                  </span>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: '#D4A96A', fontWeight: 700 }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          {entries.length > 0 && (
            <SectionCard label="Rozkład nastrojów">
              <div className="flex flex-col gap-2">
                {([5, 4, 3, 2, 1] as const).map(m => {
                  const count = entries.filter(e => e.mood === m).length
                  const pct = entries.length > 0 ? Math.round((count / entries.length) * 100) : 0
                  if (count === 0) return null
                  return (
                    <div key={m} className="flex items-center gap-2">
                      <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{MOOD_EMOJI[m]}</span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(201,153,63,0.12)' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: theme.primary }} />
                      </div>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: 'rgba(201,153,63,0.95)', minWidth: 24, textAlign: 'right', fontWeight: 700 }}>
                        {pct}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    )
  }

  // ─── Settings overlay ─────────────────────────────────────────
  function SettingsOverlay() {
    return (
      <div className="fixed inset-0 z-50 flex flex-col"
        style={{ background: theme.sidebarBg, transition: 'background 0.4s ease' }}>
        <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-[rgba(201,153,63,0.15)]">
          <div className="flex items-center gap-3">
            <Settings size={16} style={{ color: theme.primary }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: theme.primary, letterSpacing: '0.1em' }}>USTAWIENIA</span>
          </div>
          <button onClick={() => { setActiveNav(null); setConfirmDeleteAll(false) }}
            className="p-2 rounded-xl hover:bg-[rgba(201,153,63,0.1)] transition-colors"
            style={{ color: 'rgba(201,153,63,0.85)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">

          <SectionCard label="Konto">
            <div className="flex items-center gap-3 mb-3 p-3 rounded-xl" style={{ background: theme.primaryDim }}>
              <Mail size={13} style={{ color: theme.primary, flexShrink: 0, opacity: 1 }} />
              <span style={{ fontFamily: "'Lora', serif", fontSize: 12, color: '#D4A96A', fontWeight: 600 }} className="truncate">{userEmail}</span>
            </div>
            <button onClick={() => { setActiveNav(null); onLogout() }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: theme.borderColor }}>
              <LogOut size={13} style={{ color: theme.primary, opacity: 0.95 }} />
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: 'rgba(201,153,63,0.95)', letterSpacing: '0.06em', fontWeight: 700 }}>
                Wyloguj się
              </span>
            </button>
          </SectionCard>

          <SectionCard label="Nazwa użytkownika">
            <input
              type="text"
              value={localUsername}
              onChange={e => setLocalUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveUsername()}
              placeholder={userEmail.split('@')[0]}
              style={{ fontFamily: "'Lora', serif", fontSize: 14, background: 'rgba(255,255,255,0.05)' }}
              className="w-full px-3 py-2.5 rounded-xl border text-[#D4A96A] placeholder:text-[#BFA882]/70 outline-none transition-colors mb-2.5"
              onFocus={e => (e.target.style.borderColor = theme.primary + '80')}
              onBlur={e => (e.target.style.borderColor = 'rgba(201,153,63,0.2)')}
            />
            <button onClick={saveUsername}
              className="w-full py-2.5 rounded-xl font-semibold active:scale-[0.98] transition-all"
              style={{ background: theme.primary, color: '#1A0A06', fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: '0.08em' }}>
              Zapisz
            </button>
          </SectionCard>

          <SectionCard label="Twój Dom">
            <div className="grid grid-cols-2 gap-2">
              {HOUSES.map(h => {
                const selected = house === h.id
                return (
                  <button key={h.id} onClick={() => onHouseChange(h.id)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all active:scale-[0.97]"
                    style={{
                      borderColor: selected ? h.color : 'rgba(201,153,63,0.12)',
                      background: selected ? h.bg : 'rgba(255,255,255,0.02)',
                    }}>
                    <span style={{ fontSize: 22 }}>{h.emoji}</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.06em',
                      color: selected ? h.color : 'rgba(201,153,63,0.9)', fontWeight: 700 }}>
                      {h.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard label="Docs & MCP">
            <a href="/docs" target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border mb-2 transition-all"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: theme.borderColor, textDecoration: 'none' }}>
              <BookOpen size={13} style={{ color: theme.primary, opacity: 1 }} />
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: 'rgba(201,153,63,0.95)', letterSpacing: '0.06em', fontWeight: 700 }}>
                API & MCP Docs
              </span>
            </a>
          </SectionCard>

          <SectionCard label="Dane">
            <button onClick={onExport}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border mb-2 transition-all"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: theme.borderColor }}>
              <Download size={13} style={{ color: theme.primary, opacity: 1 }} />
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: 'rgba(201,153,63,0.95)', letterSpacing: '0.06em', fontWeight: 700 }}>
                Eksportuj wpisy (.json)
              </span>
            </button>

            {!confirmDeleteAll ? (
              <button onClick={() => setConfirmDeleteAll(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all"
                style={{ background: 'rgba(180,30,30,0.05)', borderColor: 'rgba(180,30,30,0.2)' }}>
                <Trash2 size={13} style={{ color: '#E05555' }} />
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: '#E05555', letterSpacing: '0.06em', fontWeight: 700 }}>
                  Usuń wszystkie wpisy
                </span>
              </button>
            ) : (
              <div className="p-3 rounded-xl border border-[rgba(180,30,30,0.3)]"
                style={{ background: 'rgba(180,30,30,0.08)' }}>
                <p style={{ fontFamily: "'Lora', serif", fontSize: 12, color: '#E05555', fontWeight: 600 }} className="mb-2.5 text-center">
                  Na pewno usunąć wszystko?
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDeleteAll(false)}
                    className="flex-1 py-1.5 rounded-xl border border-[rgba(201,153,63,0.2)] transition-colors"
                    style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: 'rgba(201,153,63,0.9)', fontWeight: 700 }}>
                    Anuluj
                  </button>
                  <button onClick={() => { onDeleteAll(); setActiveNav(null); setConfirmDeleteAll(false) }}
                    className="flex-1 py-1.5 rounded-xl transition-colors"
                    style={{ background: 'rgba(180,30,30,0.3)', fontFamily: "'Cinzel', serif", fontSize: 10, color: '#E05555', fontWeight: 700 }}>
                    Usuń
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ background: theme.sidebarBg, transition: 'background 0.4s ease' }}>

      {activeNav === 'Profil'     && <ProfileOverlay />}
      {activeNav === 'Ustawienia' && <SettingsOverlay />}

      {/* ── User profile ── */}
      <div className="px-4 pt-5 pb-4 border-b" style={{ borderColor: theme.borderColor }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: houseData
              ? `linear-gradient(135deg, ${houseData.color}99 0%, ${houseData.color}44 100%)`
              : `linear-gradient(135deg, ${theme.primary}99 0%, ${theme.primary}44 100%)`,
            border: `2px solid ${houseData?.color ?? theme.primary}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Cinzel', serif", fontSize: 15, color: '#F5EDD8', fontWeight: 600,
            boxShadow: `0 0 12px ${theme.primaryGlow}`,
            transition: 'all 0.4s ease',
          }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: theme.primary, letterSpacing: '0.05em', fontWeight: 700 }}
              className="truncate capitalize">
              {displayName}
            </p>
            {houseData && (
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: houseData.color, letterSpacing: '0.05em', fontWeight: 700 }}>
                {houseData.emoji} {houseData.name}
              </p>
            )}
          </div>
          {/* Streak badge */}
          {streak > 0 && (
            <div
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full"
              style={{
                background: todayHasEntry ? theme.primaryDim : 'rgba(80,80,80,0.2)',
                border: `1px solid ${todayHasEntry ? theme.borderColor : 'rgba(120,120,120,0.15)'}`,
                transition: 'all 0.3s ease',
              }}
              title={`Seria: ${streakLabel(streak)} z rzędu`}
            >
              <span style={{ fontSize: 12, opacity: todayHasEntry ? 1 : 0.4 }}>🔥</span>
              <span style={{
                fontFamily: "'Cinzel', serif", fontSize: 10,
                color: todayHasEntry ? theme.primary : 'rgba(200,185,165,0.85)',
                letterSpacing: '0.04em',
              }}>
                {streak}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Nav items ── */}
      <div className="px-2 py-2 border-b" style={{ borderColor: theme.borderColor }}>
        {NAV_ITEMS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            onClick={() => {
              if (label === 'Ustawienia' || label === 'Profil') setActiveNav(label)
              else toast('Wkrótce dostępne', 'info')
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150"
            onMouseEnter={e => (e.currentTarget.style.background = theme.primaryDim)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div className="flex items-center gap-2.5">
              <Icon size={14} style={{ color: theme.primary, opacity: 0.55 }} />
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: theme.primary, opacity: 1, letterSpacing: '0.06em', fontWeight: 700 }}>
                {label}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {(label === 'Postacie' || label === 'Sklep') && (
                <span style={{
                  fontFamily: "'Cinzel', serif", fontSize: 7, letterSpacing: '0.06em',
                  color: theme.primary, opacity: 0.4, background: theme.primaryDim,
                  padding: '1px 5px', borderRadius: 999,
                }}>WKRÓTCE</span>
              )}
              <ChevronRight size={12} style={{ color: theme.primary, opacity: 0.25 }} />
            </div>
          </button>
        ))}
      </div>

      {/* ── Nowy Wpis ── */}
      <div className="px-4 pt-4 pb-3">
        <button
          onClick={onNewEntry}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl active:scale-[0.98] transition-all shadow-md"
          style={{
            background: theme.primary,
            fontFamily: "'Lora', Georgia, serif", fontSize: 14, fontWeight: 700,
            color: '#1A0A06',
            boxShadow: `0 4px 14px ${theme.primaryGlow}`,
            transition: 'all 0.4s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = theme.primaryHover)}
          onMouseLeave={e => (e.currentTarget.style.background = theme.primary)}
        >
          <Feather size={14} />
          Nowy Wpis
        </button>
      </div>

      {/* ── Search ── */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#C9A87A]" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            ref={sidebarSearchRef}
            placeholder="Szukaj..."
            style={{ fontFamily: "'Lora', serif", fontSize: 13, background: 'rgba(255,255,255,0.04)' }}
            className="w-full pl-8 pr-3 py-2 rounded-xl text-[#D4A96A] placeholder:text-[#BFA882]/75 outline-none transition-colors border border-[rgba(201,169,110,0.15)]"
            onFocus={e => (e.currentTarget.style.borderColor = theme.primary + '60')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(201,169,110,0.15)')}
          />
        </div>
      </div>

      {/* ── Spis Wspomnień ── */}
      <div className="border-t pt-3 pb-1.5 px-4 text-center" style={{ borderColor: theme.borderColor }}>
        <span style={{ fontFamily: "'IM Fell English SC', serif", color: theme.primary, fontSize: 13, letterSpacing: '0.08em', fontWeight: 700 }}>
          Spis Wspomnień
        </span>
      </div>

      {/* ── Month navigator ── */}
      <div className={`flex items-center justify-between px-3 pb-1 transition-opacity duration-200 ${favOnly ? 'opacity-30 pointer-events-none' : ''}`}>
        <button onClick={() => setMonthOffset(o => o - 1)}
          className="p-1 rounded-lg transition-colors"
          style={{ color: '#C9A87A' }}
          onMouseEnter={e => (e.currentTarget.style.background = theme.primaryDim)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ChevronLeft size={16} />
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <span style={{ fontFamily: "'IM Fell English SC', serif", fontSize: 13, color: theme.primary, letterSpacing: '0.06em', fontWeight: 700 }}>
            {PL_MONTHS[activeMonth]}
          </span>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: `${theme.primary}99`, letterSpacing: '0.1em', fontWeight: 700 }}>
            {activeYear}
          </span>
          {monthsWithEntries.has(activeKey) && (
            <div className="w-1 h-1 rounded-full" style={{ background: theme.primary }} />
          )}
        </div>
        <button onClick={() => setMonthOffset(o => o + 1)}
          disabled={monthOffset >= 0}
          className="p-1 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-default"
          style={{ color: '#7A5C42' }}
          onMouseEnter={e => monthOffset < 0 && (e.currentTarget.style.background = theme.primaryDim)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ChevronRight size={16} />
        </button>
      </div>

      {entriesInMonth.length > 0 && (
        <p className="text-center pb-1"
          style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: `${theme.primary}99`, letterSpacing: '0.1em', fontWeight: 700 }}>
          {entriesInMonth.length === 1 ? '1 wpis' : entriesInMonth.length < 5 ? `${entriesInMonth.length} wpisy` : `${entriesInMonth.length} wpisów`}
        </p>
      )}

      {/* ── Mood filter ── */}
      {moodsInMonth.size > 0 && (
        <div className="flex items-center justify-center gap-1.5 px-4 pb-2">
          {([5, 4, 3, 2, 1] as const).filter(m => moodsInMonth.has(m)).map(m => (
            <button
              key={m}
              onClick={() => setMoodFilter(moodFilter === m ? null : m)}
              title={`Filtruj: ${MOOD_EMOJI[m]}`}
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all duration-150"
              style={{
                background: moodFilter === m ? 'rgba(201,153,63,0.3)' : 'rgba(201,153,63,0.08)',
                border: moodFilter === m ? `1.5px solid ${theme.primary}99` : '1.5px solid transparent',
                transform: moodFilter === m ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              {MOOD_EMOJI[m]}
            </button>
          ))}
          {moodFilter !== null && (
            <button
              onClick={() => setMoodFilter(null)}
              title="Wyczyść filtr"
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-150 hover:scale-110"
              style={{
                background: 'rgba(201,153,63,0.15)',
                border: `1.5px solid ${theme.primary}66`,
                color: theme.primary,
              }}
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* ── Ulubione + Sort pills ── */}
      <div className="px-3 pb-2 flex flex-wrap gap-1">
        <button
          onClick={() => setFavOnly(v => !v)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full transition-all"
          style={{
            fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
            background: favOnly ? theme.primary : theme.primaryDim,
            color: favOnly ? '#1A0A06' : theme.primary,
            border: `1px solid ${favOnly ? theme.primary : theme.borderColor}`,
          }}
        >
          <Heart size={9} fill={favOnly ? 'currentColor' : 'none'} />
          Ulubione
        </button>
        {(Object.keys(sortLabels) as Sort[]).map(s => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className="px-2.5 py-1 rounded-full transition-all"
            style={{
              fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
              background: sort === s ? theme.primary : theme.primaryDim,
              color: sort === s ? '#1A0A06' : theme.primary,
              border: `1px solid ${sort === s ? theme.primary : theme.borderColor}`,
            }}
          >
            {sortLabels[s]}
          </button>
        ))}
      </div>

      {/* ── Entries scroll ── */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <p style={{ fontFamily: "'Lora', serif", color: '#C9A87A', fontSize: 12, fontWeight: 500 }}
            className="italic text-center py-8 px-3">
            {favOnly ? 'Brak ulubionych wpisów.' : q || moodFilter ? 'Brak wyników.' : 'Brak wpisów w tym miesiącu.'}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5 mt-1">
            {filtered.map(entry => {
              const sel = selectedEntryId === entry.id
              return (
                <button
                  key={entry.id}
                  onClick={() => onSelectEntry(entry.id)}
                  className="group w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150"
                  style={{ background: sel ? theme.selectionBg : 'transparent' }}
                  onMouseEnter={e => !sel && (e.currentTarget.style.background = `${theme.primaryDim}`)}
                  onMouseLeave={e => !sel && (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: '#C9A87A', fontWeight: 600 }} className="mb-0.5">
                        {fmtShort(entry.date)}
                      </p>
                      <p style={{ fontFamily: "'Playfair Display', serif", color: sel ? theme.primary : '#E0B87A', fontWeight: 700 }}
                        className="text-base truncate leading-snug">
                        {entry.title || 'Bez tytułu'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                      {entry.mood ? (
                        <span className="text-sm">{MOOD_EMOJI[entry.mood]}</span>
                      ) : null}
                      <span
                        onClick={e => { e.stopPropagation(); onToggleFavorite(entry.id) }}
                        title={entry.isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), onToggleFavorite(entry.id))}
                        className={`p-0.5 rounded transition-all duration-150 cursor-pointer ${entry.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        style={{ color: entry.isFavorite ? theme.primary : 'rgba(201,153,63,0.35)', display: 'inline-flex' }}
                      >
                        <Heart size={11} fill={entry.isFavorite ? 'currentColor' : 'none'} />
                      </span>
                    </div>
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
        className="flex items-center gap-2 px-5 py-3.5 border-t transition-colors"
        style={{
          borderColor: theme.borderColor,
          fontFamily: "'Cinzel', serif", color: `${theme.primary}DD`, fontSize: 11, letterSpacing: '0.08em', fontWeight: 700,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = theme.primaryDim)}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <LogOut size={13} />
        Wyloguj się
      </button>
    </div>
  )
}
