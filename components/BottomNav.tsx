'use client'

import { Feather, BookOpen, Menu } from 'lucide-react'
import { HouseTheme, DEFAULT_THEME } from '@/lib/houseTheme'

interface BottomNavProps {
  activeView: string
  menuOpen: boolean
  onNewEntry: () => void
  onEntries: () => void
  onMenu: () => void
  theme?: HouseTheme
}

export function BottomNav({
  activeView, menuOpen, onNewEntry, onEntries, onMenu,
  theme = DEFAULT_THEME,
}: BottomNavProps) {
  const isEditor = activeView === 'new' || activeView === 'edit'
  const isList   = activeView === 'entries' || activeView === 'view'

  return (
    <nav
      className="flex items-center justify-around px-2 pt-2 border-t border-[rgba(201,169,110,0.08)]"
      style={{
        background: theme.navBg,
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        transition: 'background 0.4s ease',
      }}
    >
      <NavBtn
        icon={<Feather size={22} />}
        label="Nowy Wpis"
        active={isEditor}
        onClick={onNewEntry}
        theme={theme}
      />
      <NavBtn
        icon={<BookOpen size={22} />}
        label="Wspomnienia"
        active={isList}
        onClick={onEntries}
        theme={theme}
      />

      <NavBtn
        icon={<Menu size={22} />}
        label="Menu"
        active={menuOpen}
        onClick={onMenu}
        theme={theme}
      />
    </nav>
  )
}

function NavBtn({ icon, label, active, onClick, theme }: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
  theme: HouseTheme
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 px-5 py-1.5 rounded-xl transition-all duration-200"
      style={{
        color: active ? theme.primary : 'rgba(200,170,120,0.9)',
      }}
    >
      {icon}
      <span
        style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700 }}
        className="uppercase tracking-widest"
      >
        {label}
      </span>
    </button>
  )
}
