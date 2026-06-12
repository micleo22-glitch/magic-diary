'use client'

import { useState } from 'react'
import { MoreVertical, Eye, Trash2, AlertTriangle, Heart } from 'lucide-react'
import { Entry, MOOD_EMOJI, MOOD_LABEL } from '@/types/entry'
import { deleteEntry } from '@/lib/storage'
import { relativeDate } from '@/lib/dates'
import { toast } from '@/lib/toast'

function stripHtml(html: string): string {
  if (typeof document === 'undefined') return html
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent ?? ''
}

interface EntryCardProps {
  entry: Entry
  isSelected?: boolean
  onClick: () => void
  onDeleted: () => void
  onToggleFavorite?: () => void
}

export function EntryCard({ entry, isSelected, onClick, onDeleted, onToggleFavorite }: EntryCardProps) {
  const [menu, setMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const preview = stripHtml(entry.content).slice(0, 110)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteEntry(entry.id)
    toast('Wpis usunięty', 'info')
    onDeleted()
  }

  return (
    <div
      onClick={() => { if (!confirmDelete) onClick() }}
      className="relative rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden"
      style={{ background: isSelected ? 'rgba(201,153,63,0.18)' : 'rgba(245,237,216,0.7)' }}
    >
      {/* Main card content */}
      <div className="p-4 flex gap-3 items-start">
        <div className="flex-1 min-w-0">
          {/* Title — primary */}
          <h3 style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-[#1A0A06] font-bold text-lg leading-snug truncate mb-1">
            {entry.title || 'Bez tytułu'}
          </h3>
          {/* Meta — date + mood, quiet */}
          <div className="flex items-center gap-1.5 mb-2" style={{ fontFamily: "'Lora', serif", fontSize: 12.5, color: '#7A5C42' }}>
            <span style={{ fontWeight: 600 }}>{relativeDate(entry.date)}</span>
            {entry.mood ? (
              <>
                <span style={{ opacity: 0.5 }}>·</span>
                <span className="leading-none" style={{ fontSize: 14 }}>{MOOD_EMOJI[entry.mood]}</span>
                <span>{MOOD_LABEL[entry.mood]}</span>
              </>
            ) : null}
          </div>
          {preview && (
            <p style={{ fontFamily: "'Lora', serif", fontSize: 14, fontWeight: 500 }}
              className="text-[#5C3D28] leading-relaxed line-clamp-2">
              {preview}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          {onToggleFavorite && (
            <button
              onClick={e => { e.stopPropagation(); onToggleFavorite() }}
              className="p-2 rounded-lg transition-all duration-150 active:scale-90"
              style={{ color: entry.isFavorite ? '#C9993F' : 'rgba(122,92,66,0.55)' }}
              title={entry.isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
              aria-label={entry.isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
              aria-pressed={entry.isFavorite}
            >
              <Heart size={13} fill={entry.isFavorite ? 'currentColor' : 'none'} />
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); setMenu(v => !v); setConfirmDelete(false) }}
            className="p-2 text-[#7A5C42] hover:text-[#C9993F] rounded-lg transition-colors active:scale-90"
            aria-label="Więcej opcji"
            aria-haspopup="menu"
            aria-expanded={menu}
          >
            <MoreVertical size={14} />
          </button>
        </div>
      </div>

      {/* Delete confirmation bar */}
      {confirmDelete && (
        <div
          className="px-4 pb-3 flex items-center justify-between gap-3"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} style={{ color: '#8B1A1A', flexShrink: 0 }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: '#8B1A1A', letterSpacing: '0.04em', fontWeight: 700 }}>
              Usunąć bezpowrotnie?
            </span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(false) }}
              style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: '#7A5C42', letterSpacing: '0.06em', fontWeight: 700 }}
              className="px-2.5 py-1 rounded-lg border border-[rgba(201,153,63,0.25)] hover:border-[rgba(201,153,63,0.5)] transition-colors"
            >
              Anuluj
            </button>
            <button
              onClick={handleDelete}
              style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: '#8B1A1A', letterSpacing: '0.06em', background: 'rgba(139,26,26,0.12)', fontWeight: 700 }}
              className="px-2.5 py-1 rounded-lg border border-[rgba(139,26,26,0.3)] hover:border-[rgba(139,26,26,0.6)] transition-colors"
            >
              Usuń
            </button>
          </div>
        </div>
      )}

      {/* Context menu */}
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setMenu(false) }} />
          <div
            className="absolute right-2 top-12 z-50 rounded-xl shadow-2xl overflow-hidden border border-[rgba(201,169,110,0.25)]"
            style={{ background: '#F0E8D0', minWidth: 130 }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={e => { e.stopPropagation(); setMenu(false); onClick() }}
              style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700 }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-[#2B1A0F] hover:bg-[#C9993F]/10 uppercase tracking-wide"
            >
              <Eye size={13} />
              Podgląd
            </button>
            <button
              onClick={e => { e.stopPropagation(); setMenu(false); setConfirmDelete(true) }}
              style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700 }}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-[#8B1A1A] hover:bg-[#8B1A1A]/10 uppercase tracking-wide"
            >
              <Trash2 size={13} />
              Usuń
            </button>
          </div>
        </>
      )}
    </div>
  )
}
