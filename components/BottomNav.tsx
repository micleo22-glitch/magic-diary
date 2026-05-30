'use client'

import { Feather, BookOpen, Menu } from 'lucide-react'

interface BottomNavProps {
  activeView: string
  onNewEntry: () => void
  onEntries: () => void
}

export function BottomNav({ activeView, onNewEntry, onEntries }: BottomNavProps) {
  const isEditor = activeView === 'new' || activeView === 'edit'
  const isList = activeView === 'entries' || activeView === 'view'

  return (
    <nav
      className="flex items-center justify-around px-2 py-2 border-t border-[rgba(201,169,110,0.12)]"
      style={{ background: '#2C0F0A' }}
    >
      <NavBtn icon={<Feather size={22} />} label="Nowy Wpis" active={isEditor} onClick={onNewEntry} />
      <NavBtn icon={<BookOpen size={22} />} label="Wspomnienia" active={isList} onClick={onEntries} />
      <NavBtn icon={<Menu size={22} />} label="Menu" active={false} onClick={() => {}} />
    </nav>
  )
}

function NavBtn({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex flex-col items-center gap-1 px-5 py-1.5 rounded-xl transition-all duration-200',
        active ? 'text-[#F0C96A]' : 'text-[rgba(122,92,66,0.8)] hover:text-[#C9993F]',
      ].join(' ')}
    >
      {icon}
      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11 }} className="uppercase tracking-widest">
        {label}
      </span>
    </button>
  )
}
