'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, User, GraduationCap, ShoppingBag, Settings, LogOut,
  Download, Trash2, Mail, KeyRound, Star, BookOpen,
} from 'lucide-react'
import { SplashScreen } from './SplashScreen'
import { EntryEditor } from './EntryEditor'
import { EntriesList } from './EntriesList'
import { EntryView } from './EntryView'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { AuthScreen } from './AuthScreen'
import { ToastContainer } from './Toast'
import { Onboarding } from './Onboarding'
import { PostacieOverlay, CHARACTERS } from './PostacieOverlay'
import { CharacterChatOverlay } from './CharacterChatOverlay'
import type { Character } from './PostacieOverlay'
import { getEntries, deleteEntry } from '@/lib/storage'
import { getFavoriteIds, toggleFavorite } from '@/lib/favorites'
import { supabase } from '@/lib/supabase'
import { profileFromSession, getCachedProfile, cacheProfile, saveProfile, clearCachedProfile } from '@/lib/profile'
import { Entry, MOOD_EMOJI, MOOD_LABEL } from '@/types/entry'
import { toast } from '@/lib/toast'
import { getHouseTheme, streakLabel } from '@/lib/houseTheme'
import type { Session } from '@supabase/supabase-js'

type View = 'splash' | 'new' | 'entries' | 'view' | 'edit'
type MobilePanel = null | 'menu' | 'settings' | 'profile' | 'postacie'

function getInitials(email: string): string {
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const MENU_ITEMS = [
  { icon: User,           label: 'Profil' },
  { icon: GraduationCap,  label: 'Postacie' },
  { icon: ShoppingBag,    label: 'Sklep' },
  { icon: Settings,       label: 'Ustawienia' },
]

const HOUSES = [
  { id: 'gryffindor', name: 'Gryffindor', emoji: '🦁', color: '#C41E3A', bg: 'rgba(196,30,58,0.15)' },
  { id: 'slytherin',  name: 'Slytherin',  emoji: '🐍', color: '#2EAD6E', bg: 'rgba(46,173,110,0.12)' },
  { id: 'hufflepuff', name: 'Hufflepuff', emoji: '🦡', color: '#ECB939', bg: 'rgba(236,185,57,0.15)' },
  { id: 'ravenclaw',  name: 'Ravenclaw',  emoji: '🦅', color: '#5B8DD9', bg: 'rgba(91,141,217,0.15)' },
]

// ─── stat helpers ────────────────────────────────────────────
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

function topMood(entries: Entry[]): string | null {
  const counts: Record<number, number> = {}
  entries.forEach(e => { if (e.mood) counts[e.mood] = (counts[e.mood] ?? 0) + 1 })
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (!top) return null
  const m = Number(top[0]) as 1 | 2 | 3 | 4 | 5
  return `${MOOD_EMOJI[m]} ${MOOD_LABEL[m]}`
}

function memberSince(session: Session | null): string {
  if (!session) return '—'
  const d = new Date(session.user.created_at ?? '')
  if (isNaN(d.getTime())) return '—'
  const months = ['sty','lut','mar','kwi','maj','cze','lip','sie','wrz','paź','lis','gru']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function exportEntries(entries: Entry[]) {
  const json = JSON.stringify(entries, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `magic-diary-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── shared overlay wrapper ───────────────────────────────────
function Overlay({ title, icon: Icon, onClose, children, bg }: {
  title: string
  icon: React.ElementType
  onClose: () => void
  children: React.ReactNode
  bg?: string
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col md:hidden"
      style={{ background: bg ?? 'linear-gradient(180deg, #2C0F0A 0%, #1A0A06 100%)', transition: 'background 0.4s ease' }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-[rgba(201,153,63,0.15)]">
        <div className="flex items-center gap-3">
          <Icon size={16} style={{ color: '#C9993F' }} />
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: '#C9993F', letterSpacing: '0.1em' }}>
            {title}
          </span>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-[rgba(201,153,63,0.1)] transition-colors" style={{ color: 'rgba(201,153,63,0.5)' }}>
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">
        {children}
      </div>
    </motion.div>
  )
}

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[rgba(201,153,63,0.15)]" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="px-4 pt-4 pb-5">
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: 'rgba(201,153,63,0.5)', letterSpacing: '0.12em' }}
          className="mb-3 uppercase">{label}</p>
        {children}
      </div>
    </div>
  )
}

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [view, setView] = useState<View>('splash')
  const [entries, setEntries] = useState<Entry[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null)
  const [username, setUsername] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [house, setHouse] = useState('')
  const [defaultAgent, setDefaultAgent] = useState('snape')
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [profileChecked, setProfileChecked] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)

  // First paint: pre-fill from cache only (server metadata is the source of truth).
  useEffect(() => {
    const cached = getCachedProfile()
    if (cached.username) { setUsername(cached.username); setUsernameInput(cached.username) }
    if (cached.house) setHouse(cached.house)
    if (cached.defaultAgent) setDefaultAgent(cached.defaultAgent)
    setFavoriteIds(getFavoriteIds())
  }, [])

  // Apply the authoritative profile from the account's user_metadata, falling back
  // to the localStorage cache (legacy profiles lived only there).
  const applyProfile = useCallback((s: Session | null) => {
    const server = profileFromSession(s)
    const cached = getCachedProfile()

    const name  = server.username     || cached.username     || ''
    const h     = server.house        || cached.house        || ''
    const done  = server.onboardingDone || !!cached.onboardingDone
    const agent = server.defaultAgent || cached.defaultAgent || 'snape'

    // Authoritative — set unconditionally so nothing lingers from a previous account.
    setUsername(name); setUsernameInput(name)
    setHouse(h)
    setDefaultAgent(agent)
    setShowOnboarding(!done)
    setProfileChecked(true)

    // One-time migration: backfill legacy localStorage-only profiles into the account.
    if (done && !server.onboardingDone) {
      saveProfile({ username: name, house: h, onboardingDone: true, defaultAgent: agent })
    } else {
      cacheProfile({ username: name, house: h, onboardingDone: done, defaultAgent: agent })
    }
  }, [])

  function saveMobileUsername() {
    if (!usernameInput.trim()) return
    persistUsername(usernameInput)
  }

  async function persistUsername(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setUsername(trimmed)
    setUsernameInput(trimmed)
    const ok = await saveProfile({ username: trimmed })
    toast(ok ? 'Nazwa zapisana' : 'Nie udało się zapisać nazwy', ok ? 'success' : 'error')
  }

  async function selectMobileHouse(id: string) {
    setHouse(id)
    const ok = await saveProfile({ house: id })
    const h = HOUSES.find(h => h.id === id)
    toast(ok ? `Dom ${h?.name} wybrany` : 'Nie udało się zapisać domu', ok ? 'success' : 'error')
  }

  async function selectDefaultAgent(agentId: string) {
    setDefaultAgent(agentId)
    const ok = await saveProfile({ defaultAgent: agentId })
    if (!ok) toast('Nie udało się zapisać agenta', 'error')
  }

  const reload = useCallback(async () => {
    const data = await getEntries()
    setEntries(data)
    return data
  }, [])

  // Tracks which user we've already hydrated. supabase-js re-emits SIGNED_IN on tab
  // focus / token refresh — without this guard each re-emit would re-run applyProfile
  // and clobber in-session edits (e.g. a just-changed house) with stale session data.
  const hydratedUserId = useRef<string | null>(null)

  const hydrate = useCallback((s: Session) => {
    if (hydratedUserId.current === s.user.id) return
    hydratedUserId.current = s.user.id
    applyProfile(s)
    reload()
  }, [applyProfile, reload])

  // Auth listener — hydrate profile + entries once per signed-in user.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session
      setSession(s)
      if (s) hydrate(s)
      else setProfileChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (!s) {
        hydratedUserId.current = null
        setView('splash'); setEntries([])
        setUsername(''); setUsernameInput(''); setHouse(''); setShowOnboarding(false)
        clearCachedProfile()
        setProfileChecked(true)
        return
      }
      if (event === 'SIGNED_IN') hydrate(s)
    })
    return () => subscription.unsubscribe()
  }, [hydrate])

  const openToday = useCallback(async () => {
    const data = await reload()
    const today = new Date().toISOString().slice(0, 10)
    const todayEntry = data.find(e => e.date === today)
    if (todayEntry) {
      setSelectedId(todayEntry.id)
      setView('view')
    } else {
      setEditEntry(null)
      setView('new')
    }
  }, [reload])

  const enrichedEntries = entries.map(e => ({ ...e, isFavorite: favoriteIds.has(e.id) }))
  const selectedEntry = selectedId ? enrichedEntries.find(e => e.id === selectedId) ?? null : null

  const handleToggleFavorite = (id: string) => {
    toggleFavorite(id)
    setFavoriteIds(getFavoriteIds())
  }

  const handleSplashDone = () => {
    if (session) { reload(); setView('new') }
    else setView('entries')
  }

  const handleSaved = (entry: Entry) => {
    reload(); setSelectedId(entry.id); setView('view')
  }

  const handleSelect = (id: string) => { setSelectedId(id); setView('view') }
  const handleEdit = (entry: Entry) => { setEditEntry(entry); setView('edit') }
  const handleDeleted = () => { reload(); setSelectedId(null); setView('entries') }
  const handleNew = () => { setEditEntry(null); setView('new') }
  const handleLogout = async () => { await supabase.auth.signOut() }

  async function handleDeleteAll() {
    for (const e of entries) await deleteEntry(e.id)
    reload()
    setConfirmDeleteAll(false)
    setMobilePanel(null)
    toast('Wszystkie wpisy usunięte', 'info')
  }

  if (session === undefined) return null

  if (view === 'splash') {
    return (
      <>
        <ToastContainer />
        <AnimatePresence>
          <SplashScreen onDone={handleSplashDone} />
        </AnimatePresence>
      </>
    )
  }

  if (!session) return <><ToastContainer /><AuthScreen /></>

  // Wait for the account profile before deciding whether to show onboarding,
  // so a logged-in user never flashes the onboarding flow again.
  if (!profileChecked) return null

  if (showOnboarding) {
    return (
      <>
        <ToastContainer />
        <Onboarding onDone={(name, h) => {
          if (name) { setUsername(name); setUsernameInput(name) }
          if (h) setHouse(h)
          const patch: { username?: string; house?: string; onboardingDone: boolean } = { onboardingDone: true }
          if (name) patch.username = name
          if (h) patch.house = h
          saveProfile(patch)
          setShowOnboarding(false)
        }} />
      </>
    )
  }

  function RightPanel() {
    if (view === 'new') {
      return (
        <EntryEditor key="new" onSave={handleSaved} onCancel={() => setView(selectedId ? 'view' : 'entries')} />
      )
    }
    if (view === 'edit' && editEntry) {
      return (
        <EntryEditor
          key={`edit-${editEntry.id}`}
          entry={editEntry}
          onSave={e => { reload(); setSelectedId(e.id); setView('view') }}
          onCancel={() => setView('view')}
        />
      )
    }
    if (view === 'view' && selectedEntry) {
      return (
        <EntryView
          key={selectedEntry.id}
          entry={selectedEntry}
          onEdit={handleEdit}
          onDelete={handleDeleted}
          onBack={() => setView('entries')}
          onToggleFavorite={() => handleToggleFavorite(selectedEntry.id)}
          theme={houseTheme}
        />
      )
    }
    return (
      <div className="parchment-bg h-full flex flex-col items-center justify-center gap-3">
        <span style={{ fontSize: 56, opacity: 0.18 }}>✍️</span>
        <p style={{ fontFamily: "'Playfair Display', serif", color: 'rgba(201,153,63,0.55)', fontSize: 18 }}
          className="italic">
          Wybierz wpis z listy lub utwórz nowy
        </p>
      </div>
    )
  }

  const userEmail     = session?.user?.email ?? ''
  const houseData     = HOUSES.find(h => h.id === house)
  const streak        = calcStreak(entries)
  const topMoodStr    = topMood(entries)
  const houseTheme    = getHouseTheme(house)
  const todayIso      = new Date().toISOString().slice(0, 10)
  const todayHasEntry = entries.some(e => e.date === todayIso)
  const rightPanel    = RightPanel()

  // ─── Settings panels (shared between mobile & desktop, rendered differently) ───

  function SettingsContent() {
    return (
      <>
        {/* Konto */}
        <SectionCard label="Konto">
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ background: 'rgba(201,153,63,0.06)' }}>
            <Mail size={14} style={{ color: 'rgba(201,153,63,0.5)', flexShrink: 0 }} />
            <span style={{ fontFamily: "'Lora', serif", fontSize: 13, color: '#D4A96A' }} className="truncate">
              {userEmail}
            </span>
          </div>
          <button
            onClick={() => { setMobilePanel(null); handleLogout() }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[rgba(201,153,63,0.12)] hover:border-[rgba(201,153,63,0.3)] transition-all"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <LogOut size={14} style={{ color: 'rgba(201,153,63,0.5)' }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: 'rgba(201,153,63,0.7)', letterSpacing: '0.06em' }}>
              Wyloguj się
            </span>
          </button>
        </SectionCard>

        {/* Nazwa użytkownika */}
        <SectionCard label="Nazwa użytkownika">
          <input
            type="text"
            value={usernameInput}
            onChange={e => setUsernameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveMobileUsername()}
            placeholder={userEmail.split('@')[0]}
            style={{ fontFamily: "'Lora', serif", fontSize: 15, background: 'rgba(255,255,255,0.05)' }}
            className="w-full px-4 py-3 rounded-xl border border-[rgba(201,153,63,0.2)] text-[#D4A96A] placeholder:text-[#7A5C42]/50 outline-none focus:border-[#C9993F]/50 transition-colors mb-3"
          />
          <button
            onClick={saveMobileUsername}
            style={{ fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: '0.08em' }}
            className="w-full py-3 rounded-xl bg-[#C9993F] text-[#1A0A06] font-semibold hover:bg-[#D4A84A] active:scale-[0.98] transition-all"
          >
            Zapisz
          </button>
        </SectionCard>

        {/* Twój Dom */}
        <SectionCard label="Twój Dom">
          <div className="grid grid-cols-2 gap-2">
            {HOUSES.map(h => {
              const selected = house === h.id
              return (
                <button
                  key={h.id}
                  onClick={() => selectMobileHouse(h.id)}
                  className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all active:scale-[0.97]"
                  style={{
                    borderColor: selected ? h.color : 'rgba(201,153,63,0.12)',
                    background: selected ? h.bg : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <span style={{ fontSize: 26 }}>{h.emoji}</span>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: selected ? h.color : 'rgba(201,153,63,0.55)', letterSpacing: '0.06em' }}>
                    {h.name}
                  </span>
                </button>
              )
            })}
          </div>
        </SectionCard>

        {/* Rozmowa w wpisach z */}
        <SectionCard label="Rozmowa w wpisach z">
          <div className="relative">
            <select
              value={defaultAgent}
              onChange={e => selectDefaultAgent(e.target.value)}
              style={{
                fontFamily: "'Lora', serif",
                fontSize: 14,
                background: 'rgba(255,255,255,0.05)',
                color: defaultAgent ? '#D4A96A' : 'rgba(191,168,130,0.5)',
                borderColor: 'rgba(201,153,63,0.2)',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
              className="w-full px-4 py-3 pr-10 rounded-xl border text-[#D4A96A] outline-none focus:border-[#C9993F]/50 transition-colors cursor-pointer"
            >
              {CHARACTERS.filter(c => !c.locked).map(c => (
                <option key={c.id} value={c.id} style={{ background: '#1A1008', color: '#D4A96A' }}>
                  {c.name}
                </option>
              ))}
              {CHARACTERS.filter(c => c.locked).map(c => (
                <option key={c.id} value={c.id} disabled style={{ background: '#1A1008', color: 'rgba(201,153,63,0.35)' }}>
                  🔒 {c.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                <path d="M1 1l5 5 5-5" stroke="rgba(201,153,63,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p style={{ fontFamily: "'Lora', serif", fontSize: 11, color: 'rgba(201,153,63,0.4)', marginTop: 8 }}>
            Wybrana postać będzie domyślnie otwarta w nowych wpisach.
          </p>
        </SectionCard>

        {/* Docs & MCP */}
        <SectionCard label="Docs & MCP">
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[rgba(201,153,63,0.12)] hover:border-[rgba(201,153,63,0.3)] transition-all"
            style={{ background: 'rgba(255,255,255,0.02)', textDecoration: 'none', display: 'flex' }}
          >
            <BookOpen size={14} style={{ color: 'rgba(201,153,63,0.5)' }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: 'rgba(201,153,63,0.7)', letterSpacing: '0.06em' }}>
              API & MCP Docs
            </span>
          </a>
        </SectionCard>

        {/* Dane */}
        <SectionCard label="Dane">
          <button
            onClick={() => { exportEntries(entries); toast('Plik pobrany', 'success') }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[rgba(201,153,63,0.12)] hover:border-[rgba(201,153,63,0.3)] mb-2 transition-all"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <Download size={14} style={{ color: 'rgba(201,153,63,0.5)' }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: 'rgba(201,153,63,0.7)', letterSpacing: '0.06em' }}>
              Eksportuj wpisy (.json)
            </span>
          </button>

          {!confirmDeleteAll ? (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[rgba(180,30,30,0.2)] hover:border-[rgba(180,30,30,0.5)] transition-all"
              style={{ background: 'rgba(180,30,30,0.05)' }}
            >
              <Trash2 size={14} style={{ color: '#E05555' }} />
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: '#E05555', letterSpacing: '0.06em' }}>
                Usuń wszystkie wpisy
              </span>
            </button>
          ) : (
            <div className="p-3 rounded-xl border border-[rgba(180,30,30,0.3)]" style={{ background: 'rgba(180,30,30,0.08)' }}>
              <p style={{ fontFamily: "'Lora', serif", fontSize: 13, color: '#E05555' }} className="mb-3 text-center">
                Na pewno? Tego nie można cofnąć.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDeleteAll(false)}
                  className="flex-1 py-2 rounded-xl border border-[rgba(201,153,63,0.2)] transition-colors"
                  style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: 'rgba(201,153,63,0.6)' }}>
                  Anuluj
                </button>
                <button onClick={handleDeleteAll}
                  className="flex-1 py-2 rounded-xl transition-colors"
                  style={{ background: 'rgba(180,30,30,0.3)', fontFamily: "'Cinzel', serif", fontSize: 11, color: '#E05555' }}>
                  Usuń
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      </>
    )
  }

  function ProfileContent() {
    return (
      <>
        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: houseData
              ? `linear-gradient(135deg, ${houseData.color}99 0%, ${houseData.color}44 100%)`
              : 'linear-gradient(135deg, #C9993F 0%, #8B5E2A 100%)',
            border: `2px solid ${houseData?.color ?? 'rgba(201,153,63,0.4)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Cinzel', serif", fontSize: 24, color: '#F5EDD8', fontWeight: 600,
          }}>
            {username ? username.slice(0, 2).toUpperCase() : getInitials(userEmail)}
          </div>
          <div className="text-center">
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: '#C9993F' }}>
              {username || userEmail.split('@')[0]}
            </p>
            {houseData && (
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: houseData.color, letterSpacing: '0.08em' }}>
                {houseData.emoji} {houseData.name}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <SectionCard label="Statystyki">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Wpisów', value: entries.length.toString() },
              { label: 'Seria dni', value: streak > 0 ? `${streak} 🔥` : '—' },
              { label: 'Nastrój', value: topMoodStr ?? '—' },
              { label: 'Dołączył/a', value: memberSince(session ?? null) },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl"
                style={{ background: 'rgba(201,153,63,0.06)', border: '1px solid rgba(201,153,63,0.1)' }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: 'rgba(201,153,63,0.45)', letterSpacing: '0.1em' }}>
                  {label.toUpperCase()}
                </span>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, color: '#D4A96A' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Mood distribution */}
        {entries.length > 0 && (
          <SectionCard label="Rozkład nastrojów">
            <div className="flex flex-col gap-2">
              {([5, 4, 3, 2, 1] as const).map(m => {
                const count = entries.filter(e => e.mood === m).length
                const pct = entries.length > 0 ? Math.round((count / entries.length) * 100) : 0
                if (count === 0) return null
                return (
                  <div key={m} className="flex items-center gap-3">
                    <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{MOOD_EMOJI[m]}</span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(201,153,63,0.12)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: 'rgba(201,153,63,0.6)' }} />
                    </div>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: 'rgba(201,153,63,0.5)', minWidth: 28, textAlign: 'right' }}>
                      {pct}%
                    </span>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        )}
      </>
    )
  }

  return (
    <div className="flex overflow-hidden" style={{ background: '#1A0A06', height: '100dvh' }}>
      <ToastContainer />

      {/* ===== MOBILE: Full-screen menu overlay ===== */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(10,4,2,0.75)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 md:hidden rounded-t-3xl overflow-hidden"
              style={{ background: houseTheme.navBg, borderTop: `1px solid ${houseTheme.borderColor}`, maxHeight: '85dvh', transition: 'background 0.4s ease' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(201,153,63,0.3)' }} />
              </div>
              <button onClick={() => setMenuOpen(false)} className="absolute top-3 right-4 p-2 rounded-xl" style={{ color: 'rgba(201,153,63,0.5)' }}>
                <X size={18} />
              </button>

              {/* Avatar + name */}
              <div className="flex items-center gap-4 px-6 py-5 border-b" style={{ borderColor: houseTheme.borderColor }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                  background: houseData
                    ? `linear-gradient(135deg, ${houseData.color}99 0%, ${houseData.color}44 100%)`
                    : `linear-gradient(135deg, ${houseTheme.primary}99 0%, ${houseTheme.primary}44 100%)`,
                  border: `2px solid ${houseData?.color ?? houseTheme.primary}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Cinzel', serif", fontSize: 18, color: '#F5EDD8', fontWeight: 600,
                  boxShadow: `0 0 14px ${houseTheme.primaryGlow}`,
                }}>
                  {username ? username.slice(0, 2).toUpperCase() : getInitials(userEmail)}
                </div>
                <div className="min-w-0 flex-1">
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: houseTheme.primary, letterSpacing: '0.05em' }}
                    className="truncate capitalize">
                    {username || userEmail.split('@')[0]}
                  </p>
                  {houseData && (
                    <p style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: houseData.color, letterSpacing: '0.05em' }}>
                      {houseData.emoji} {houseData.name}
                    </p>
                  )}
                </div>
                {streak > 0 && (
                  <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full"
                    style={{
                      background: todayHasEntry ? houseTheme.primaryDim : 'rgba(80,80,80,0.2)',
                      border: `1px solid ${todayHasEntry ? houseTheme.borderColor : 'rgba(120,120,120,0.15)'}`,
                    }}>
                    <span style={{ fontSize: 13, opacity: todayHasEntry ? 1 : 0.4 }}>🔥</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11,
                      color: todayHasEntry ? houseTheme.primary : 'rgba(150,150,150,0.6)' }}>
                      {streak}
                    </span>
                  </div>
                )}
              </div>

              {/* Nav items */}
              <div className="px-3 py-3">
                {MENU_ITEMS.map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    onClick={() => {
                      setMenuOpen(false)
                      if (label === 'Ustawienia') setMobilePanel('settings')
                      else if (label === 'Profil') setMobilePanel('profile')
                      else if (label === 'Postacie') setMobilePanel('postacie')
                      else toast('Wkrótce dostępne', 'info')
                    }}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-colors"
                    style={{ color: houseTheme.primary }}
                    onMouseEnter={e => (e.currentTarget.style.background = houseTheme.primaryDim)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Icon size={20} style={{ color: houseTheme.primary, opacity: 0.65 }} />
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: '0.08em' }}>
                      {label}
                    </span>
                    {label === 'Sklep' && (
                      <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full"
                        style={{ background: houseTheme.primaryDim, color: houseTheme.primary, opacity: 0.6, fontFamily: "'Cinzel', serif", letterSpacing: '0.06em' }}>
                        Wkrótce
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Wyloguj */}
              <button
                onClick={() => { setMenuOpen(false); handleLogout() }}
                className="w-full flex items-center gap-3 px-7 py-4 border-t transition-colors"
                style={{
                  borderColor: houseTheme.borderColor,
                  fontFamily: "'Cinzel', serif", color: `${houseTheme.primary}CC`, fontSize: 12, letterSpacing: '0.08em', fontWeight: 700,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = houseTheme.primaryDim)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut size={15} style={{ opacity: 0.75 }} />
                Wyloguj się
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== Settings overlay (mobile) ===== */}
      <AnimatePresence>
        {mobilePanel === 'settings' && (
          <Overlay title="USTAWIENIA" icon={Settings} onClose={() => { setMobilePanel(null); setConfirmDeleteAll(false) }} bg={houseTheme.sidebarBg}>
            <SettingsContent />
          </Overlay>
        )}
      </AnimatePresence>

      {/* ===== Profile overlay (mobile) ===== */}
      <AnimatePresence>
        {mobilePanel === 'profile' && (
          <Overlay title="PROFIL" icon={User} onClose={() => setMobilePanel(null)} bg={houseTheme.sidebarBg}>
            <ProfileContent />
          </Overlay>
        )}
      </AnimatePresence>

      {/* ===== Postacie overlay (mobile) ===== */}
      <AnimatePresence>
        {mobilePanel === 'postacie' && !selectedCharacter && (
          <PostacieOverlay
            onClose={() => setMobilePanel(null)}
            onSelectCharacter={(char) => setSelectedCharacter(char)}
            theme={houseTheme}
          />
        )}
      </AnimatePresence>

      {/* ===== Character chat overlay (mobile) ===== */}
      <AnimatePresence>
        {selectedCharacter && (
          <CharacterChatOverlay
            character={selectedCharacter}
            onBack={() => setSelectedCharacter(null)}
            theme={houseTheme}
          />
        )}
      </AnimatePresence>

      {/* ===== DESKTOP: Left sidebar ===== */}
      <div className="hidden md:flex flex-col flex-shrink-0 border-r border-[rgba(201,169,110,0.1)]" style={{ width: 320 }}>
        <Sidebar
          entries={enrichedEntries}
          selectedEntryId={selectedId}
          onSelectEntry={handleSelect}
          onNewEntry={handleNew}
          onToggleFavorite={handleToggleFavorite}
          userEmail={session.user.email ?? ''}
          username={username}
          house={house}
          defaultAgent={defaultAgent}
          theme={houseTheme}
          onLogout={handleLogout}
          onUsernameChange={persistUsername}
          onHouseChange={selectMobileHouse}
          onDefaultAgentChange={selectDefaultAgent}
          onExport={() => { exportEntries(entries); toast('Plik pobrany', 'success') }}
          onDeleteAll={handleDeleteAll}
          onPostacie={() => setMobilePanel('postacie')}
        />
      </div>

      {/* ===== DESKTOP: Right panel ===== */}
      <div className="hidden md:flex flex-1 overflow-y-auto">
        <div className="w-full">
          {rightPanel}
        </div>
      </div>

      {/* ===== MOBILE: Single panel views ===== */}
      <div className="flex md:hidden flex-1 flex-col overflow-hidden">
        <div
          className="flex-shrink-0 flex items-center justify-center px-4 py-3 border-b"
          style={{ background: houseTheme.navBg, borderColor: houseTheme.borderColor, transition: 'background 0.4s ease' }}
        >
          {/* Logo centered */}
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Magic Diary" width={32} height={32}
              style={{ objectFit: 'contain', filter: `drop-shadow(0 0 10px ${houseTheme.primaryGlow})` }} />
            <span style={{ fontFamily: "'IM Fell English SC', serif", color: houseTheme.primary, fontSize: 19, letterSpacing: '0.1em', transition: 'color 0.4s ease' }}>
              Magic Diary
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {view === 'entries' ? (
            <EntriesList
              entries={enrichedEntries}
              selectedEntryId={selectedId}
              onSelectEntry={handleSelect}
              onNewEntry={handleNew}
              onEntryDeleted={handleDeleted}
              onToggleFavorite={handleToggleFavorite}
            />
          ) : (
            rightPanel
          )}
        </div>
        <div className="flex-shrink-0">
          <BottomNav
            activeView={view}
            menuOpen={menuOpen}
            onNewEntry={handleNew}
            onEntries={() => setView('entries')}
            onMenu={() => setMenuOpen(o => !o)}
            theme={houseTheme}
          />
        </div>
      </div>
    </div>
  )
}
