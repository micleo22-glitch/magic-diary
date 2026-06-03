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
  { icon: GraduationCap,  label: 'Nauczyciel' },
  { icon: ShoppingBag,    label: 'Sklep' },
  { icon: Settings,       label: 'Ustawienia' },
]

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [view, setView] = useState<View>('splash')
  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

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
                  {getInitials(userEmail)}
                </div>
                <div className="min-w-0">
                  <p style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: '#C9993F', letterSpacing: '0.05em' }}
                    className="truncate capitalize">
                    {userEmail.split('@')[0]}
                  </p>
                  <p style={{ fontFamily: "'Lora', serif", fontSize: 11, color: 'rgba(201,153,63,0.4)' }}
                    className="truncate">
                    {userEmail}
                  </p>
                </div>
              </div>

              {/* Nav items */}
              <div className="px-3 py-3">
                {MENU_ITEMS.map(({ icon: Icon, label }) => (
                  <button
                    key={label}
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
