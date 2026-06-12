'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Quote, List, ListOrdered,
  Mic, Lock, Save, ImagePlus, Image as ImageIcon, X, Loader2,
  Calendar, ChevronDown, Smile,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { MoodPicker } from './MoodPicker'
import { WeekCalendar } from './WeekCalendar'
import { createEntry, updateEntry } from '@/lib/storage'
import { uploadEntryPhoto, deleteEntryPhoto } from '@/lib/entry-photos'
import { supabase } from '@/lib/supabase'
import { Entry, MOOD_EMOJI, MOOD_LABEL } from '@/types/entry'
import { toast } from '@/lib/toast'

const DRAFT_KEY = 'magic_diary_draft'

interface PendingPhoto {
  id: string
  name: string
  path: string
  status: 'uploading' | 'done' | 'error'
}

// Compact label for the date chip: "Dziś" for today, otherwise "11 cze".
function fmtDateChip(iso: string): string {
  const todayIso = new Date().toISOString().split('T')[0]
  if (iso === todayIso) return 'Dziś'
  const d = new Date(iso)
  const months = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
    'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

function extractFirstSentence(html: string): string {
  if (typeof document === 'undefined') return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  const text = (tmp.textContent ?? '').trim()
  const end = text.search(/[.!?]/)
  const sentence = end > 0 ? text.slice(0, end + 1) : text.slice(0, 60)
  return sentence.trim()
}

interface EntryEditorProps {
  entry?: Entry
  onSave: (e: Entry) => void
  onCancel: () => void
}

interface TBtnProps {
  onClick: () => void
  active: boolean
  title: string
  disabled?: boolean
  children: React.ReactNode
}

function TBtn({ onClick, active, title, disabled, children }: TBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      type="button"
      className={[
        'p-2 rounded-lg transition-all duration-150 relative active:scale-90',
        active ? 'bg-[#C9993F] text-white' : 'text-[#7A5C42] hover:bg-[#C9993F]/15 hover:text-[#C9993F]',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function EntryEditor({ entry, onSave, onCancel }: EntryEditorProps) {
  const isNew = !entry

  // For new entries, try to restore draft
  const initDraft = () => {
    if (!isNew) return null
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      return raw ? JSON.parse(raw) : null
    } catch (_e) { return null }
  }
  const draft = useRef(initDraft())

  const [title, setTitle] = useState(entry?.title ?? draft.current?.title ?? '')
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5 | null>(entry?.mood ?? draft.current?.mood ?? null)
  const [date, setDate] = useState(entry?.date ?? draft.current?.date ?? new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  // Progressive disclosure: only one meta panel (date | mood) expanded at a time.
  const [metaPanel, setMetaPanel] = useState<'date' | 'mood' | null>(null)
  // Voice dictation (Web Speech API)
  const [isRecording, setIsRecording] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load existing photos when editing
  useEffect(() => {
    if (entry?.photos?.length) {
      setPendingPhotos(entry.photos.map(path => ({
        id: crypto.randomUUID(),
        name: path.split('/').pop() ?? path,
        path,
        status: 'done' as const,
      })))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: 'Zacznij pisać swoje myśli...' }),
    ],
    content: entry?.content ?? draft.current?.content ?? '',
    editorProps: {
      attributes: { class: 'tiptap-content outline-none' },
    },
  })

  // Writing is the primary action — focus the editor body on mount for new entries.
  useEffect(() => {
    if (!isNew || !editor) return
    const t = setTimeout(() => editor.commands.focus('end'), 120)
    return () => clearTimeout(t)
  }, [isNew, editor])

  // Detect Web Speech API support (Chrome/Edge/Safari) and clean up on unmount.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setSpeechSupported(!!SR)
    return () => { try { recognitionRef.current?.stop() } catch { /* noop */ } }
  }, [])

  // Toggle voice dictation: final transcript chunks are inserted at the cursor.
  const toggleDictation = useCallback(() => {
    if (!editor) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    if (isRecording) {
      try { recognitionRef.current?.stop() } catch { /* noop */ }
      return
    }

    const rec = new SR()
    rec.lang = 'pl-PL'
    rec.continuous = true
    rec.interimResults = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let finalText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript
      }
      const t = finalText.trim()
      if (t) editor.chain().focus().insertContent(t + ' ').run()
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        toast('Brak dostępu do mikrofonu', 'error')
      } else if (e.error === 'no-speech') {
        toast('Nie wykryto mowy', 'info')
      }
      setIsRecording(false)
    }
    rec.onend = () => { setIsRecording(false); recognitionRef.current = null }

    recognitionRef.current = rec
    try {
      rec.start()
      setIsRecording(true)
      toast('Słucham… mów po polsku', 'info')
    } catch {
      setIsRecording(false)
    }
  }, [editor, isRecording])

  // Auto-save draft for new entries every 30s
  useEffect(() => {
    if (!isNew || !editor) return
    const interval = setInterval(() => {
      const content = editor.getHTML()
      const text = editor.getText().trim()
      if (!text) return
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, content, mood, date }))
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    }, 30000)
    return () => clearInterval(interval)
  }, [isNew, editor, title, mood, date])

  const handlePhotoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return

    const donePhohos = pendingPhotos.filter(p => p.status !== 'error').length
    const remaining = 3 - donePhohos
    if (remaining <= 0) return
    const toAdd = files.slice(0, remaining)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    for (const file of toAdd) {
      const tempId = crypto.randomUUID()
      setPendingPhotos(prev => [...prev, { id: tempId, name: file.name, path: '', status: 'uploading' }])
      try {
        const path = await uploadEntryPhoto(user.id, date, file)
        setPendingPhotos(prev => prev.map(p => p.id === tempId ? { ...p, path, status: 'done' } : p))
        toast('Zdjęcie dodane', 'success')
      } catch {
        setPendingPhotos(prev => prev.map(p => p.id === tempId ? { ...p, status: 'error' } : p))
        toast('Nie udało się dodać zdjęcia', 'error')
      }
    }
  }, [pendingPhotos, date])

  const handleRemovePhoto = useCallback(async (id: string) => {
    const photo = pendingPhotos.find(p => p.id === id)
    if (!photo) return

    setPendingPhotos(prev => prev.filter(p => p.id !== id))

    if (photo.path && photo.status === 'done') {
      await deleteEntryPhoto(photo.path).catch(() => {})
      // If editing existing entry, persist the removal immediately
      if (!isNew && entry) {
        const newPaths = pendingPhotos
          .filter(p => p.id !== id && p.status === 'done')
          .map(p => p.path)
        await updateEntry(entry.id, { photos: newPaths }).catch(() => {})
      }
    }
  }, [pendingPhotos, isNew, entry])

  const handleSave = useCallback(async () => {
    if (!editor) return
    const content = editor.getHTML()
    const text = editor.getText().trim()
    const donePaths = pendingPhotos.filter(p => p.status === 'done').map(p => p.path)
    if (!text && !donePaths.length) return
    setSaving(true)

    const finalTitle = title.trim() || extractFirstSentence(content)

    try {
      let saved: Entry | null
      if (entry) {
        saved = await updateEntry(entry.id, { title: finalTitle, content, mood, date, photos: donePaths })
      } else {
        saved = await createEntry({ title: finalTitle, content, mood, date, photos: donePaths })
      }
      if (saved) {
        localStorage.removeItem(DRAFT_KEY)
        toast(entry ? 'Zmiany zapisane' : 'Wpis zapisany', 'success')
        onSave(saved)
      }
    } catch (_e) {
      toast('Nie udało się zapisać', 'error')
    } finally {
      setSaving(false)
    }
  }, [editor, entry, title, mood, date, pendingPhotos, onSave])

  const donePhotos = pendingPhotos.filter(p => p.status === 'done').length
  const canSave = (editor ? editor.getText().trim().length > 0 : false) || donePhotos > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="parchment-bg min-h-full flex flex-col"
    >
      {/* === META BAR (data + nastrój, progresywne odsłanianie) === */}
      <div className="px-4 pt-4 pb-3 border-b border-[rgba(201,169,110,0.2)]">
        <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
          {/* Date chip */}
          <button
            type="button"
            onClick={() => setMetaPanel(p => (p === 'date' ? null : 'date'))}
            aria-expanded={metaPanel === 'date'}
            aria-label={`Data wpisu: ${fmtDateChip(date)}. Kliknij, aby zmienić.`}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all active:scale-[0.97]"
            style={{
              borderColor: metaPanel === 'date' ? '#C9993F' : 'rgba(201,169,110,0.3)',
              background: metaPanel === 'date' ? 'rgba(201,153,63,0.12)' : 'rgba(255,255,255,0.4)',
            }}
          >
            <Calendar size={15} style={{ color: '#C9993F' }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 700, color: '#5C3D28', letterSpacing: '0.02em' }}>
              {fmtDateChip(date)}
            </span>
            <ChevronDown
              size={13}
              style={{
                color: '#7A5C42',
                transform: metaPanel === 'date' ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>

          {/* Mood chip */}
          <button
            type="button"
            onClick={() => setMetaPanel(p => (p === 'mood' ? null : 'mood'))}
            aria-expanded={metaPanel === 'mood'}
            aria-label={mood ? `Nastrój: ${MOOD_LABEL[mood]}. Kliknij, aby zmienić.` : 'Wybierz nastrój dnia'}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all active:scale-[0.97]"
            style={{
              borderColor: metaPanel === 'mood' ? '#C9993F' : 'rgba(201,169,110,0.3)',
              background: metaPanel === 'mood' ? 'rgba(201,153,63,0.12)' : 'rgba(255,255,255,0.4)',
            }}
          >
            {mood ? (
              <span style={{ fontSize: 15, lineHeight: 1 }}>{MOOD_EMOJI[mood]}</span>
            ) : (
              <Smile size={15} style={{ color: '#C9993F' }} />
            )}
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 700, color: '#5C3D28', letterSpacing: '0.02em' }}>
              {mood ? MOOD_LABEL[mood] : 'Nastrój'}
            </span>
            <ChevronDown
              size={13}
              style={{
                color: '#7A5C42',
                transform: metaPanel === 'mood' ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>

          {/* Photo chip — direct action (opens file picker) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={donePhotos >= 3}
            aria-label={donePhotos >= 3 ? 'Osiągnięto limit 3 zdjęć' : 'Dodaj zdjęcie'}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: donePhotos > 0 ? '#C9993F' : 'rgba(201,169,110,0.3)',
              background: donePhotos > 0 ? 'rgba(201,153,63,0.12)' : 'rgba(255,255,255,0.4)',
            }}
          >
            <ImagePlus size={15} style={{ color: '#C9993F' }} />
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 700, color: '#5C3D28', letterSpacing: '0.02em' }}>
              {donePhotos > 0 ? `Zdjęcia ${donePhotos}/3` : 'Zdjęcie'}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
            multiple
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>

        {/* Expandable panels */}
        <AnimatePresence initial={false}>
          {metaPanel === 'date' && (
            <motion.div
              key="date-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3">
                <WeekCalendar selectedDate={date} onSelectDate={setDate} />
              </div>
            </motion.div>
          )}
          {metaPanel === 'mood' && (
            <motion.div
              key="mood-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3">
                <MoodPicker value={mood} onChange={setMood} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* === TITLE === */}
      <div className="px-4 pt-4 pb-2">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Tytuł wpisu (opcjonalnie)..."
          className="title-input w-full bg-transparent outline-none pb-3 border-b border-[rgba(201,169,110,0.25)]"
          style={{
            fontFamily: "'Lora', Georgia, serif",
            color: '#1A0A06',
            fontSize: 17,
            fontWeight: 500,
          }}
        />
      </div>

      {/* === TOOLBAR === */}
      {editor && (
        <div className="toolbar-scroll border-b border-[rgba(201,169,110,0.15)]">
        <div className="px-3 py-2 flex flex-wrap items-center justify-center gap-0.5 md:flex-nowrap md:justify-start md:min-w-max">
          <TBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
            <Bold size={15} />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
            <Italic size={15} />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
            <UnderlineIcon size={15} />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Przekreślenie">
            <Strikethrough size={15} />
          </TBtn>
          <div className="w-px h-5 bg-[rgba(201,169,110,0.3)] mx-1 self-center" />
          <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Nagłówek 1">
            <Heading1 size={15} />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Nagłówek 2">
            <Heading2 size={15} />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Cytat">
            <Quote size={15} />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista punktowa">
            <List size={15} />
          </TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerowana">
            <ListOrdered size={15} />
          </TBtn>
          <div className="w-px h-5 bg-[rgba(201,169,110,0.3)] mx-1 self-center" />
          <TBtn
            onClick={toggleDictation}
            active={isRecording}
            title={speechSupported
              ? (isRecording ? 'Zatrzymaj dyktowanie' : 'Dyktowanie głosowe (pl)')
              : 'Dyktowanie niedostępne w tej przeglądarce'}
            disabled={!speechSupported}
          >
            <span className="relative inline-flex">
              <Mic size={15} className={isRecording ? 'animate-pulse' : ''} />
              {!speechSupported && <Lock size={8} className="absolute -bottom-0.5 -right-0.5" />}
            </span>
          </TBtn>
          {/* Recording indicator */}
          {isRecording && (
            <span className="ml-3 flex items-center gap-1.5 flex-shrink-0"
              aria-live="polite"
              style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.06em', color: '#B43030' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#B43030' }} />
              Słucham…
            </span>
          )}

          {/* Draft saved indicator */}
          {draftSaved && !isRecording && (
            <span className="ml-4 flex items-center gap-1 text-[#7A5C42] opacity-70 flex-shrink-0"
              style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.06em' }}>
              <Save size={10} />
              Szkic zapisany
            </span>
          )}
        </div>
        </div>
      )}

      {/* === PHOTO ATTACHMENT CHIPS === */}
      {pendingPhotos.length > 0 && (
        <div className="px-3 py-2 flex flex-wrap gap-2 border-b border-[rgba(201,169,110,0.12)]"
          style={{ background: 'rgba(201,153,63,0.04)' }}>
          {pendingPhotos.map(photo => (
            <div
              key={photo.id}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border"
              style={{
                background: photo.status === 'error' ? 'rgba(180,30,30,0.07)' : 'rgba(201,153,63,0.09)',
                borderColor: photo.status === 'error' ? 'rgba(180,30,30,0.25)' : 'rgba(201,153,63,0.3)',
                fontFamily: "'Cinzel', serif",
                fontSize: 10,
                letterSpacing: '0.04em',
                color: photo.status === 'error' ? '#E05555' : '#7A5C42',
                maxWidth: 260,
              }}
            >
              {photo.status === 'uploading' ? (
                <Loader2 size={11} className="animate-spin flex-shrink-0" style={{ color: '#C9993F' }} />
              ) : (
                <ImageIcon size={11} className="flex-shrink-0" style={{ color: photo.status === 'error' ? '#E05555' : '#C9993F' }} />
              )}
              <span className="truncate" style={{ maxWidth: 130 }}>
                {photo.status === 'uploading' ? 'Zdjęcie dodawane...' : photo.status === 'error' ? 'Błąd uploadu' : 'Zdjęcie dodane ✓'}
              </span>
              <button
                type="button"
                onClick={() => handleRemovePhoto(photo.id)}
                className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity ml-0.5"
                title="Usuń"
              >
                <X size={11} />
              </button>
            </div>
          ))}
          {donePhotos > 0 && (
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: 'rgba(122,92,66,0.45)', letterSpacing: '0.05em' }}
              className="self-center ml-1">
              {donePhotos}/3
            </span>
          )}
        </div>
      )}

      {/* === EDITOR === */}
      <div className="flex-1 tiptap-editor">
        <EditorContent editor={editor} />
      </div>

      {/* Draft restore banner (for new entries with existing draft) */}
      {isNew && draft.current && (
        <div className="mx-4 mb-2 px-4 py-2.5 rounded-xl border border-[rgba(201,153,63,0.3)] flex items-center justify-between gap-3"
          style={{ background: 'rgba(201,153,63,0.08)', fontFamily: "'Cinzel', serif", fontSize: 11, color: '#C9993F', letterSpacing: '0.04em', fontWeight: 600 }}>
          <span>Znaleziono niezapisany szkic</span>
          <button
            onClick={() => { localStorage.removeItem(DRAFT_KEY); draft.current = null; window.location.reload() }}
            className="underline opacity-60 hover:opacity-100 transition-opacity"
          >
            Odrzuć
          </button>
        </div>
      )}

      {/* === SAVE BUTTON === */}
      <div className="sticky bottom-0 px-4 py-4"
        style={{ background: 'linear-gradient(to top, #F5EDD8 60%, transparent)' }}>
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className={[
            'w-full py-3.5 rounded-2xl transition-all duration-200',
            canSave && !saving
              ? 'bg-[#C9993F] text-white shadow-md hover:bg-[#D4A84A] active:scale-[0.98]'
              : 'bg-[#C9993F]/20 text-[#7A5C42] cursor-not-allowed',
          ].join(' ')}
          style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 16, fontWeight: 700 }}
        >
          {saving ? 'Zapisywanie...' : entry ? 'Zapisz zmiany' : 'Zapisz wpis'}
        </button>
      </div>
    </motion.div>
  )
}
