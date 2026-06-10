'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Pencil, Trash2, AlertTriangle, Heart, X } from 'lucide-react'
import { Entry, MOOD_EMOJI, MOOD_LABEL } from '@/types/entry'
import { deleteEntry } from '@/lib/storage'
import { getSignedUrls } from '@/lib/entry-photos'
import { AgentChat } from './AgentChat'
import { toast } from '@/lib/toast'
import { HouseTheme, DEFAULT_THEME } from '@/lib/houseTheme'
import DOMPurify from 'isomorphic-dompurify'

const ROTATIONS = [-2, 1.5, -1]

// ── Lightbox ────────────────────────────────────────────────────
function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const lastDist = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Non-passive touchmove for pinch-to-zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || lastDist.current === null) return
      e.preventDefault()
      const [a, b] = [e.touches[0], e.touches[1]]
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      setScale(s => Math.max(0.5, Math.min(6, s * (d / lastDist.current!))))
      lastDist.current = d
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]]
      lastDist.current = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    }
  }, [])

  const handleTouchEnd = useCallback(() => { lastDist.current = null }, [])

  // Double-tap to toggle 2× zoom
  const handleDoubleClick = useCallback(() => {
    setScale(s => s > 1 ? 1 : 2)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.82)' }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full transition-all"
        style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.22)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)' }}
      >
        <X size={18} />
      </button>

      {/* Image container */}
      <div
        ref={containerRef}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        style={{ touchAction: 'none', cursor: scale > 1 ? 'zoom-out' : 'zoom-in' }}
      >
        <motion.img
          src={url}
          alt=""
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          draggable={false}
          style={{
            maxHeight: '90vh',
            maxWidth: '92vw',
            objectFit: 'contain',
            display: 'block',
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            transition: lastDist.current === null ? 'transform 0.18s ease' : 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        />
      </div>
    </motion.div>
  )
}

// ── Polaroid ─────────────────────────────────────────────────────
function PolaroidPhoto({ url, rotation, onClick }: { url: string; rotation: number; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        padding: '10px 10px 30px 10px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.035)',
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.2s ease',
        display: 'inline-block',
        maxWidth: 200,
        cursor: 'pointer',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'rotate(0deg) scale(1.05)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = `rotate(${rotation}deg)` }}
    >
      <img
        src={url}
        alt=""
        style={{ display: 'block', width: '100%', height: 170, objectFit: 'cover', pointerEvents: 'none' }}
      />
    </div>
  )
}

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
  onToggleFavorite?: () => void
  theme?: HouseTheme
}

export function EntryView({ entry, onEdit, onDelete, onBack, onToggleFavorite, theme = DEFAULT_THEME }: EntryViewProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  useEffect(() => {
    if (entry.photos?.length) {
      getSignedUrls(entry.photos).then(setPhotoUrls).catch(() => {})
    } else {
      setPhotoUrls([])
    }
  }, [entry.photos])

  const handleDelete = async () => {
    setDeleting(true)
    await deleteEntry(entry.id)
    toast('Wpis usunięty', 'info')
    onDelete()
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
          style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700 }}
        >
          <ArrowLeft size={15} />
          Wróć
        </button>

        <div className="flex items-center gap-2">
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              title={entry.isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all"
              style={{
                color: entry.isFavorite ? '#C9993F' : 'rgba(122,92,66,0.5)',
                borderColor: entry.isFavorite ? 'rgba(201,153,63,0.5)' : 'rgba(122,92,66,0.2)',
                background: entry.isFavorite ? 'rgba(201,153,63,0.1)' : 'transparent',
              }}
            >
              <Heart size={13} fill={entry.isFavorite ? 'currentColor' : 'none'} />
            </button>
          )}
          <button
            onClick={() => onEdit(entry)}
            style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700 }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[#C9993F] border border-[#C9993F]/35 rounded-xl hover:bg-[#C9993F]/10 transition-all tracking-wide"
          >
            <Pencil size={13} />
            Edytuj
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[#8B1A1A] border border-[#8B1A1A]/35 rounded-xl hover:bg-[#8B1A1A]/10 transition-all"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Delete confirmation bar */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-b border-[rgba(180,30,30,0.2)]"
            style={{ background: 'rgba(180,30,30,0.07)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} style={{ color: '#E05555', flexShrink: 0 }} />
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: '#E05555', letterSpacing: '0.04em', fontWeight: 700 }}>
                  Usunąć ten wpis bezpowrotnie?
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: 'rgba(201,153,63,0.6)', letterSpacing: '0.06em', fontWeight: 700 }}
                  className="px-3 py-1.5 rounded-lg border border-[rgba(201,153,63,0.2)] hover:border-[rgba(201,153,63,0.4)] transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{ background: 'rgba(180,30,30,0.3)', color: '#E05555', fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.06em', fontWeight: 700 }}
                  className="px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting ? '...' : 'Usuń'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        {/* Date */}
        <p style={{ fontFamily: "'IM Fell English SC', serif", color: '#7A5C42', fontSize: 13, fontWeight: 600 }}
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
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: '#7A5C42', fontWeight: 600 }}
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

        {/* Polaroid photos */}
        {photoUrls.length > 0 && (
          <div className="flex flex-wrap justify-center gap-8 mb-10" style={{ paddingTop: 4 }}>
            {photoUrls.map((url, i) => (
              <PolaroidPhoto
                key={i}
                url={url}
                rotation={ROTATIONS[i % ROTATIONS.length]}
                onClick={() => setLightboxUrl(url)}
              />
            ))}
          </div>
        )}

        {/* Body */}
        <div
          className="entry-content"
          style={{ fontFamily: "'Lora', serif", color: '#2B1A0F', lineHeight: 1.85, fontSize: 16, fontWeight: 500 }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(entry.content) }}
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

      <AgentChat entry={entry} theme={theme} />

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
