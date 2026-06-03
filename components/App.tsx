'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, User, GraduationCap, ShoppingBag, Settings, LogOut } from 'lucide-react'
import { SplashScreen } from './SplashScreen'
import { EntryEditor } from './EntryEditor'
import { EntriesList } from './EntriesList'
import { EntryView } from './EntryView'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { AuthScreen } from './AuthScreen'
import { getEntries } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { Entry } from '@/types/entry'
import type { Session } from '@supabase/supabase-js'

type View = 'splash' | 'new' | 'entries' | 'view' | 'edit'

function getInitials(email: string): string {
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const MENU_ITEMS = [
  { icon: User,           label: 'Profil' },
  { icon: GraduationCap,  label: 'Nauczyciele' },
  { icon: ShoppingBag,    label: 'Sklep' },
  { icon: Settings,       label: 'Ustawienia' },
]

const HOUSES = [
  { id: 'gryffindor', name: 'Gryffindor', emoji: '🦁', color: '#C41E3A', bg: 'rgba(196,30,58,0.15)' },
  { id: 'slytherin',  name: 'Slytherin',  emoji: '🐍', color: '#2EAD6E', bg: 'rgba(46,173,110,0.12)' },
  { id: 'hufflepuff', name: 'Hufflepuff', emoji: '🦡', color: '#ECB939', bg: 'rgba(236,185,57,0.15)' },
  { id: 'ravenclaw',  name: 'Ravenclaw',  emoji: '🦅', color: '#5B8DD9', bg: 'rgba(91,141,217,0.15)' },
]

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [view, setView] = useState<View>('splash')
  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [house, setHouse] = useState('')

  useEffect(() => {
    const savedName = localStorage.getItem('magic_diary_username')
    const savedHouse = localStorage.getItem('magic_diary_house')
    if (savedName) { setUsername(savedName); setUsernameInput(savedName) }
    if (savedHouse) setHouse(savedHouse)
  }, [])

  function saveMobileUsername() {
    localStorage.setItem('magic_diary_username', usernameInput)
    setUsername(usernameInput)
  }

  function selectMobileHouse(id: string) {
    localStorage.setItem('magic_diary_house', id)
    setHouse(id)
  }

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) { setView('splash'); setEntries([]) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const reload = useCallback(async () => {
    const data = await getEntries()
    setEntries(data)
    return data
  }, [])

  useEffect(() => { reload() }, [reload])

  // After splash + login: open today's entry or new-entry editor for today
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

  const selectedEntry = selectedId ? entries.find(e => e.id === selectedId) ?? null : null

  // === Handlers ===
  const handleSplashDone = () => {
    if (session) { reload(); setView('new') }
    else setView('entries') // session null → falls through to <AuthScreen />
  }

  const handleSaved = (entry: Entry) => {
    reload(); setSelectedId(entry.id); setView('view')
  }

  const handleSelect = (id: string) => {
    setSelectedId(id); setView('view')
  }

  const handleEdit = (entry: Entry) => {
    setEditEntry(entry); setView('edit')
  }

  const handleDeleted = () => {
    reload(); setSelectedId(null); setView('entries')
  }

  const handleNew = () => {
    setEditEntry(null); setView('new')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  // Still resolving session
  if (session === undefined) return null

  // Show splash first on every load — auth check happens after
  if (view === 'splash') {
    return (
      <AnimatePresence>
        <SplashScreen onDone={handleSplashDone} />
      </AnimatePresence>
    )
  }

  // After splash: not logged in → auth screen
  if (!session) return <AuthScreen />

  // === Right panel content (desktop always; mobile for non-list views) ===
  function RightPanel() {
    if (view === 'new') {
      return (
        <EntryEditor
          key="new"
          onSave={handleSaved}
          onCancel={() => setView(selectedId ? 'view' : 'entries')}
        />
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
        />
      )
    }
    // Welcome / empty state on desktop
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

  const userEmail = session?.user?.email ?? ''

  return (
    <div className="flex overflow-hidden" style={{ background: '#1A0A06', height: '100dvh' }}>

      {/* ===== MOBILE: Full-screen menu overlay ===== */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(10,4,2,0.75)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
            />

            {/* Menu panel — slides up from bottom */}
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 md:hidden rounded-t-3xl overflow-hidden"
              style={{ background: '#2C0F0A', borderTop: '1px solid rgba(201,169,110,0.2)', maxHeight: '85dvh' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(201,153,63,0.3)' }} />
              </div>

              {/* Close button */}
              <button
                onClick={() => setMenuOpen(false)}
                className="absolute top-3 right-4 p-2 rounded-xl"
                style={{ color: 'rgba(201,153,63,0.5)' }}
              >
                <X size={18} />
              </button>

              {/* Avatar + name */}
              <div className="flex items-center gap-4 px-6 py-5 border-b border-[rgba(201,169,110,0.12)]">
                <div style={{
                  width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #C9993F 0%, #8B5E2A 100%)',
                  border: '2px solid rgba(201,153,63,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Cinzel', serif", fontSize: 18, color: '#1A0A06', fontWeight: 600,
                }}>
                  {username ? username.slice(0, 2).toUpperCase() : getInitials(userEmail)}
                </div>
                <div className="min-w-0">
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: '#C9993F', letterSpacing: '0.05em' }}
                    className="truncate capitalize">
                    {username || userEmail.split('@')[0]}
                  </p>
                </div>
              </div>

              {/* Nav items */}
              <div className="px-3 py-3">
                {MENU_ITEMS.map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    onClick={() => {
                      if (label === 'Ustawienia') { setMenuOpen(false); setSettingsOpen(true) }
                    }}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-colors"
                    style={{ color: '#C9993F' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,153,63,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Icon size={20} style={{ color: 'rgba(201,153,63,0.6)' }} />
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: '0.08em' }}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Wyloguj */}
              <div className="px-3 pb-6 border-t border-[rgba(201,169,110,0.1)] pt-3" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
                <button
                  onClick={() => { setMenuOpen(false); handleLogout() }}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,153,63,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <LogOut size={20} style={{ color: 'rgba(201,153,63,0.6)' }} />
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: '0.08em', color: '#C9993F' }}>
                    Wyloguj się
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== Settings full-screen overlay (mobile) ===== */}
      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col md:hidden"
            style={{ background: 'linear-gradient(180deg, #2C0F0A 0%, #1A0A06 100%)' }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
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
                onClick={() => setSettingsOpen(false)}
                className="p-2 rounded-xl hover:bg-[rgba(201,153,63,0.1)] transition-colors"
                style={{ color: 'rgba(201,153,63,0.5)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Settings content */}
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
                          onClick={() => selectMobileHouse(h.id)}
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== DESKTOP: Left sidebar ===== */}
      <div
        className="hidden md:flex flex-col flex-shrink-0 border-r border-[rgba(201,169,110,0.1)]"
        style={{ width: 288 }}
      >
        <Sidebar
          entries={entries}
          selectedEntryId={selectedId}
          onSelectEntry={handleSelect}
          onNewEntry={handleNew}
          userEmail={session.user.email ?? ''}
          onLogout={handleLogout}
        />
      </div>

      {/* ===== DESKTOP: Right panel ===== */}
      <div className="hidden md:flex flex-1 overflow-y-auto">
        <div className="w-full">
          <RightPanel />
        </div>
      </div>

      {/* ===== MOBILE: Single panel views ===== */}
      <div className="flex md:hidden flex-1 flex-col overflow-hidden">
        {/* Mobile logo header — always visible */}
        <div
          className="leather-bg flex-shrink-0 flex items-center justify-center px-4 py-3 border-b border-[rgba(201,169,110,0.18)]"
        >
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Magic Diary"
              width={34}
              height={34}
              style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(201,153,63,0.5))' }}
            />
            <span
              style={{ fontFamily: "'IM Fell English SC', serif", color: '#C9993F', fontSize: 19, letterSpacing: '0.1em' }}
            >
              Magic Diary
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {view === 'entries' ? (
            <EntriesList
              entries={entries}
              selectedEntryId={selectedId}
              onSelectEntry={handleSelect}
              onNewEntry={handleNew}
              onEntryDeleted={handleDeleted}
            />
          ) : (
            <RightPanel />
          )}
        </div>
        <div className="flex-shrink-0">
          <BottomNav
            activeView={view}
            menuOpen={menuOpen}
            onNewEntry={handleNew}
            onEntries={() => setView('entries')}
            onMenu={() => setMenuOpen(o => !o)}
          />
        </div>
      </div>
    </div>
  )
}
