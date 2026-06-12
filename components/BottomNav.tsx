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
      className="flex items-stretch border-t"
      style={{
        background: theme.navGlass,
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderColor: theme.borderColor,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        transition: 'background 0.4s ease',
      }}
    >
      <NavBtn
        icon={<Feather size={21} />}
        label="Nowy Wpis"
        active={isEditor}
        onClick={onNewEntry}
        theme={theme}
      />
      <NavBtn
        icon={<BookOpen size={21} />}
        label="Wspomnienia"
        active={isList}
        onClick={onEntries}
        theme={theme}
      />

      <NavBtn
        icon={<Menu size={21} />}
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
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all duration-200 active:scale-95"
      style={{
        color: active ? theme.primary : 'rgba(200,170,120,0.85)',
      }}
    >
      <span
        className="flex items-center justify-center px-5 py-1 rounded-full transition-all duration-200"
        style={{
          background: active ? theme.accentDim : 'transparent',
          boxShadow: active ? `0 0 14px ${theme.primaryGlow}` : 'none',
          color: active ? theme.accent : 'inherit',
        }}
      >
        {icon}
      </span>
      <span
        style={{ fontFamily: "'Cinzel', serif", fontSize: 10.5, fontWeight: 700 }}
        className="uppercase tracking-widest"
      >
        {label}
      </span>
    </button>
  )
}
