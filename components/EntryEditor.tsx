'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Quote, List, ListOrdered,
  Mic, PenLine, Lock, Save,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { MoodPicker } from './MoodPicker'
import { WeekCalendar } from './WeekCalendar'
import { createEntry, updateEntry } from '@/lib/storage'
import { Entry } from '@/types/entry'
import { toast } from '@/lib/toast'

const DRAFT_KEY = 'magic_diary_draft'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'Dzień dobry'
  if (h >= 12 && h < 18) return 'Dobrego popołudnia'
  if (h >= 18 && h < 22) return 'Dobry wieczór'
  return 'Dobranoc'
}

function getDayAndDate(): { day: string; date: string } {
  const now = new Date()
  const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']
  const months = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']
  return { day: days[now.getDay()], date: `${now.getDate()} ${months[now.getMonth()]}` }
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
      type="button"
      className={[
        'p-1.5 rounded-lg transition-all duration-150 relative',
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

  const greeting = getGreeting()
  const { day, date: dateLabel } = getDayAndDate()

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

  const handleSave = useCallback(async () => {
    if (!editor) return
    const content = editor.getHTML()
    const text = editor.getText().trim()
    if (!text) return
    setSaving(true)

    // Auto-generate title from first sentence if empty
    const finalTitle = title.trim() || extractFirstSentence(content)

    try {
      let saved: Entry | null
      if (entry) {
        saved = await updateEntry(entry.id, { title: finalTitle, content, mood, date })
      } else {
        saved = await createEntry({ title: finalTitle, content, mood, date })
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
  }, [editor, entry, title, mood, date, onSave])

  const canSave = editor ? editor.getText().trim().length > 0 : false

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="parchment-bg min-h-full flex flex-col"
    >
      {/* === HEADER === */}
      <div className="pt-5 pb-4 border-b border-[rgba(201,169,110,0.2)]">

        {/* Greeting + day/date */}
        <div className="px-4 mb-3">
          <p style={{ fontFamily: "'Lora', Georgia, serif", color: '#7A5C42', fontSize: 30, lineHeight: 1.15, fontWeight: 500 }}
            className="mb-1">
            {greeting}
          </p>
          <p style={{ fontFamily: "'Cinzel', serif", color: '#5C3D28', fontSize: 15, fontWeight: 600 }}>
            {day} &nbsp;·&nbsp; {dateLabel}
          </p>
        </div>

        {/* Calendar */}
        <WeekCalendar selectedDate={date} onSelectDate={setDate} />

        {/* Mood */}
        <div className="px-4 mt-4">
          <p style={{ fontFamily: "'Cinzel', serif", color: '#5C3D28', fontSize: 14, fontWeight: 600 }}
            className="text-center mb-3">
            Jak się dziś czujesz?
          </p>
          <MoodPicker value={mood} onChange={setMood} />
        </div>
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
        <div className="px-3 py-2 flex items-center gap-0.5 min-w-max">
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
          <TBtn onClick={() => {}} active={false} title="Dyktowanie — już wkrótce" disabled>
            <span className="relative inline-flex">
              <Mic size={15} />
              <Lock size={8} className="absolute -bottom-0.5 -right-0.5" />
            </span>
          </TBtn>
          <TBtn onClick={() => {}} active={false} title="Odręczne pisanie — już wkrótce" disabled>
            <span className="relative inline-flex">
              <PenLine size={15} />
              <Lock size={8} className="absolute -bottom-0.5 -right-0.5" />
            </span>
          </TBtn>

          {/* Draft saved indicator */}
          {draftSaved && (
            <span className="ml-4 flex items-center gap-1 text-[#7A5C42] opacity-70 flex-shrink-0"
              style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.06em' }}>
              <Save size={10} />
              Szkic zapisany
            </span>
          )}
        </div>
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
