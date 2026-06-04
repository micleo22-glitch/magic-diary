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
  streak?: number
  todayHasEntry?: boolean
}

export function BottomNav({
  activeView, menuOpen, onNewEntry, onEntries, onMenu,
  theme = DEFAULT_THEME,
  streak = 0,
  todayHasEntry = false,
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

      {/* Streak badge sits above Menu button */}
      <div className="relative flex flex-col items-center">
        {streak > 0 && (
          <div
            className="absolute -top-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
            style={{
              background: todayHasEntry ? theme.primaryDim : 'rgba(80,80,80,0.25)',
              border: `1px solid ${todayHasEntry ? theme.borderColor : 'rgba(120,120,120,0.2)'}`,
              fontSize: 9,
              fontFamily: "'Cinzel', serif",
              letterSpacing: '0.04em',
              color: todayHasEntry ? theme.primary : 'rgba(150,150,150,0.7)',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              transition: 'all 0.3s ease',
            }}
          >
            <span style={{ fontSize: 10, opacity: todayHasEntry ? 1 : 0.4 }}>🔥</span>
            {streak}
          </div>
        )}
        <NavBtn
          icon={<Menu size={22} />}
          label="Menu"
          active={menuOpen}
          onClick={onMenu}
          theme={theme}
        />
      </div>
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
        color: active ? theme.primary : 'rgba(122,92,66,0.8)',
      }}
    >
      {icon}
      <span
        style={{ fontFamily: "'Cinzel', serif", fontSize: 11 }}
        className="uppercase tracking-widest"
      >
        {label}
      </span>
    </button>
  )
}
