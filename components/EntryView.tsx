'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Entry, MOOD_EMOJI, MOOD_LABEL } from '@/types/entry'
import { deleteEntry } from '@/lib/storage'
import { AgentChat } from './AgentChat'

function fmtFull(iso: string): string {
  const d = new Date(iso)
  const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']
  const months = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

interface EntryViewProps {
  entry: Entry
  onEdit: (e: Entry) => void
  onDelete: () => void
  onBack: () => void
}

export function EntryView({ entry, onEdit, onDelete, onBack }: EntryViewProps) {
  const handleDelete = async () => {
    if (confirm('Usunąć ten wpis? Tej operacji nie można cofnąć.')) {
      await deleteEntry(entry.id)
      onDelete()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="parchment-bg min-h-full flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(201,169,110,0.2)]">
        <button
          onClick={onBack}
          className="md:invisible flex items-center gap-1.5 text-[#7A5C42] hover:text-[#C9993F] transition-colors"
          style={{ fontFamily: "'Cinzel', serif", fontSize: 11 }}
        >
          <ArrowLeft size={15} />
          Wróć
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(entry)}
            style={{ fontFamily: "'Cinzel', serif", fontSize: 11 }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[#C9993F] border border-[#C9993F]/35 rounded-xl hover:bg-[#C9993F]/10 transition-all tracking-wide"
          >
            <Pencil size={13} />
            Edytuj
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[#8B1A1A] border border-[#8B1A1A]/35 rounded-xl hover:bg-[#8B1A1A]/10 transition-all"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        {/* Date */}
        <p style={{ fontFamily: "'IM Fell English SC', serif", color: '#7A5C42', fontSize: 13 }}
          className="text-center mb-3">
          {fmtFull(entry.date)}
        </p>

        {/* Title */}
        <h1 style={{ fontFamily: "'Playfair Display', serif" }}
          className="text-[#C9993F] text-3xl font-bold text-center mb-4 leading-snug">
          {entry.title || 'Bez tytułu'}
        </h1>

        {/* Mood */}
        {entry.mood ? (
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-2xl">{MOOD_EMOJI[entry.mood]}</span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: '#7A5C42' }}
              className="tracking-wide">
              {MOOD_LABEL[entry.mood]}
            </span>
          </div>
        ) : null}

        {/* Ornament divider */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1"
            style={{ background: 'linear-gradient(to right, transparent, rgba(201,153,63,0.35))' }} />
          <span style={{ color: 'rgba(201,153,63,0.6)', fontSize: 20 }}>❧</span>
          <div className="h-px flex-1"
            style={{ background: 'linear-gradient(to left, transparent, rgba(201,153,63,0.35))' }} />
        </div>

        {/* Body */}
        <div
          className="entry-content"
          style={{ fontFamily: "'Lora', serif", color: '#2B1A0F', lineHeight: 1.85, fontSize: 16 }}
          dangerouslySetInnerHTML={{ __html: entry.content }}
        />

        {/* Watermark feather */}
        <div className="mt-16 flex justify-center" style={{ opacity: 0.12 }}>
          <svg width="64" height="80" viewBox="0 0 64 80" fill="none">
            <path d="M32 4 C20 12, 6 24, 4 44 C6 60, 18 70, 32 72 C46 70, 58 60, 60 44 C58 24, 44 12, 32 4Z"
              stroke="#C9993F" strokeWidth="1.5" fill="none" />
            <path d="M32 4 L32 72" stroke="#C9993F" strokeWidth="0.8" />
            <path d="M32 20 Q44 30, 55 35" stroke="#C9993F" strokeWidth="0.6" fill="none" />
            <path d="M32 32 Q44 40, 52 46" stroke="#C9993F" strokeWidth="0.6" fill="none" />
            <path d="M32 44 Q42 50, 48 56" stroke="#C9993F" strokeWidth="0.6" fill="none" />
            <path d="M32 20 Q20 30, 9 35" stroke="#C9993F" strokeWidth="0.6" fill="none" />
            <path d="M32 32 Q20 40, 12 46" stroke="#C9993F" strokeWidth="0.6" fill="none" />
            <path d="M32 44 Q22 50, 16 56" stroke="#C9993F" strokeWidth="0.6" fill="none" />
          </svg>
        </div>
      </div>

      <AgentChat entryTitle={entry.title} />
    </motion.div>
  )
}
