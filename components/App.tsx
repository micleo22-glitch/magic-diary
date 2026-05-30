'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SplashScreen } from './SplashScreen'
import { EntryEditor } from './EntryEditor'
import { EntriesList } from './EntriesList'
import { EntryView } from './EntryView'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { getEntries } from '@/lib/storage'
import { Entry } from '@/types/entry'

type View = 'splash' | 'new' | 'entries' | 'view' | 'edit'

export function App() {
  const [view, setView] = useState<View>('splash')
  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState<Entry | null>(null)

  const reload = useCallback(() => setEntries(getEntries()), [])

  useEffect(() => { reload() }, [reload])

  const selectedEntry = selectedId ? entries.find(e => e.id === selectedId) ?? null : null

  // === Handlers ===
  const handleSplashDone = () => { reload(); setView('new') }

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

  // === Splash ===
  if (view === 'splash') {
    return (
      <AnimatePresence>
        <SplashScreen onDone={handleSplashDone} />
      </AnimatePresence>
    )
  }

  return (
    <div className="flex overflow-hidden" style={{ background: '#1A0A06', height: '100dvh' }}>

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
          className="flex-shrink-0 flex items-center justify-center gap-3 py-3 border-b border-[rgba(201,169,110,0.18)]"
          style={{ background: '#2C0F0A' }}
        >
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
            onNewEntry={handleNew}
            onEntries={() => setView('entries')}
          />
        </div>
      </div>
    </div>
  )
}
