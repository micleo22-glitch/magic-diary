'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useIsPresent } from 'framer-motion'
import { ArrowLeft, Feather, MessageCircle, Trash2, AlertTriangle, Heart, X, ZoomIn, ZoomOut } from 'lucide-react'
import { Entry, MOOD_EMOJI, MOOD_LABEL } from '@/types/entry'
import { deleteEntry } from '@/lib/storage'
import { getSignedUrls } from '@/lib/entry-photos'
import { toast } from '@/lib/toast'
import { HouseTheme, DEFAULT_THEME } from '@/lib/houseTheme'
import DOMPurify from 'isomorphic-dompurify'

const ROTATIONS = [-2, 1.5, -1]

// ── Lightbox ────────────────────────────────────────────────────
const MIN_SCALE = 1
const MAX_SCALE = 8

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const [scale, setScale] = useState(1)
  const [pinching, setPinching] = useState(false)
  const [dragging, setDragging] = useState(false)
  // Absolute pinch reference: distance + scale captured at gesture start
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isPresent = useIsPresent()
  const zoomed = scale > 1

  const clamp = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s))

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

  // Non-passive listener for pinch-to-zoom (mobile)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinchStart.current) return
      e.preventDefault()
      const [a, b] = [e.touches[0], e.touches[1]]
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
      // Absolute scale relative to the gesture start — no compounding/jitter
      setScale(clamp(pinchStart.current.scale * (d / pinchStart.current.dist)))
    }

    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]]
      pinchStart.current = {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        scale,
      }
      setPinching(true)
    }
  }, [scale])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchStart.current = null
      setPinching(false)
    }
  }, [])

  // Click / tap toggles zoom (matches the zoom-in / zoom-out cursor)
  const toggleZoom = useCallback(() => {
    setScale(s => (s > 1 ? 1 : 2.5))
  }, [])

  const zoomIn = () => setScale(s => clamp(s * 1.4))
  const zoomOut = () => setScale(s => clamp(s / 1.4))
  const resetZoom = () => setScale(1)

  // A dragged image should not also fire the click-to-toggle
  const draggedRef = useRef(false)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.82)', pointerEvents: isPresent ? 'auto' : 'none' }}
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
        className="flex items-center justify-center"
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          touchAction: 'none',
          cursor: zoomed ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
        }}
      >
        <motion.img
          src={url}
          alt=""
          initial={{ opacity: 0 }}
          animate={{ scale, opacity: 1 }}
          transition={pinching ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 28, opacity: { duration: 0.2 } }}
          drag={zoomed && isPresent}
          dragMomentum={false}
          dragElastic={0.06}
          onDragStart={() => { draggedRef.current = true; setDragging(true) }}
          onDragEnd={() => { setDragging(false); setTimeout(() => { draggedRef.current = false }, 0) }}
          onClick={() => { if (!draggedRef.current) toggleZoom() }}
          draggable={false}
          style={{
            maxHeight: '90vh',
            maxWidth: '92vw',
            objectFit: 'contain',
            display: 'block',
            transformOrigin: 'center',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        />
      </div>

      {/* Zoom controls */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-full px-1.5 py-1.5"
        style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
        onClick={e => e.stopPropagation()}
      >
        {[
          { content: <ZoomOut size={18} />, action: zoomOut, label: 'Pomniejsz', disabled: scale <= MIN_SCALE, wide: false },
          { content: 'Reset', action: resetZoom, label: 'Resetuj', disabled: scale === 1, wide: true },
          { content: <ZoomIn size={18} />, action: zoomIn, label: 'Powiększ', disabled: scale >= MAX_SCALE, wide: false },
        ].map((b, i) => (
          <button
            key={i}
            onClick={b.action}
            disabled={b.disabled}
            aria-label={b.label}
            className={`h-9 flex items-center justify-center rounded-full transition-all ${b.wide ? 'px-4 text-sm font-medium' : 'w-9'}`}
            style={{ color: 'rgba(255,255,255,0.85)', opacity: b.disabled ? 0.35 : 1 }}
            onMouseEnter={e => { if (!b.disabled) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            {b.content}
          </button>
        ))}
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
  onChatWithCharacter?: () => void
  theme?: HouseTheme
}

export function EntryView({ entry, onEdit, onDelete, onBack, onToggleFavorite, onChatWithCharacter, theme = DEFAULT_THEME }: EntryViewProps) {
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
              aria-label={entry.isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
              aria-pressed={entry.isFavorite}
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
            <Feather size={13} />
            Edytuj
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label="Usuń wpis"
            title="Usuń wpis"
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
          <Feather size={14} style={{ color: 'rgba(201,153,63,0.55)', flexShrink: 0 }} strokeWidth={1.5} />
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

        {/* Chat with character button */}
        {onChatWithCharacter && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={onChatWithCharacter}
              className="flex items-center gap-2.5 px-5 py-3 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'rgba(201,153,63,0.85)',
                borderColor: 'rgba(201,153,63,0.25)',
                background: 'rgba(201,153,63,0.06)',
              }}
            >
              <MessageCircle size={14} style={{ opacity: 0.8 }} />
              Pogadaj o tym z postacią
            </button>
          </div>
        )}

        {/* Watermark */}
        <div className="mt-10 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-bg.png" alt="" aria-hidden="true"
            style={{ width: 120, height: 120, objectFit: 'contain', opacity: 0.12, pointerEvents: 'none', userSelect: 'none' }} />
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
