'use client'

import { useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Quote, List, ListOrdered,
  Mic, PenLine, Lock,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { MoodPicker } from './MoodPicker'
import { WeekCalendar } from './WeekCalendar'
import { createEntry, updateEntry } from '@/lib/storage'
import { Entry } from '@/types/entry'

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
  const [title, setTitle] = useState(entry?.title ?? '')
  const [mood, setMood] = useState<number | null>(entry?.mood ?? null)
  const [date, setDate] = useState(entry?.date ?? new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  const greeting = getGreeting()
  const { day, date: dateLabel } = getDayAndDate()

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: 'Zacznij pisać swoje myśli...' }),
    ],
    content: entry?.content ?? '',
    editorProps: {
      attributes: { class: 'tiptap-content outline-none' },
    },
  })

  const handleSave = useCallback(() => {
    if (!editor) return
    const content = editor.getHTML()
    const text = editor.getText().trim()
    if (!text) return
    setSaving(true)
    setTimeout(() => {
      let saved: Entry | null
      if (entry) {
        saved = updateEntry(entry.id, { title, content, mood, date })
      } else {
        saved = createEntry({ title, content, mood, date })
      }
      setSaving(false)
      if (saved) onSave(saved)
    }, 300)
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
          {/* Greeting — duże */}
          <p style={{ fontFamily: "'Lora', Georgia, serif", color: '#7A5C42', fontSize: 30, lineHeight: 1.15 }}
            className="mb-1">
            {greeting}
          </p>
          {/* Dzień + data — normalna wielkość liter */}
          <p style={{ fontFamily: "'Cinzel', serif", color: '#5C3D28', fontSize: 15 }}>
            {day} &nbsp;·&nbsp; {dateLabel}
          </p>
        </div>

        {/* Calendar — pełna szerokość jak bottom nav */}
        <WeekCalendar selectedDate={date} onSelectDate={setDate} />

        {/* Mood */}
        <div className="px-4 mt-4">
          <p style={{ fontFamily: "'Cinzel', serif", color: '#5C3D28', fontSize: 14 }}
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
          placeholder="Tytuł wpisu..."
          className="title-input w-full bg-transparent outline-none pb-3 border-b border-[rgba(201,169,110,0.25)]"
          style={{
            fontFamily: "'Lora', Georgia, serif",
            color: '#1A0A06',
            fontSize: 17,
            fontWeight: 400,
          }}
        />
      </div>

      {/* === TOOLBAR === */}
      {editor && (
        <div className="px-3 py-2 flex flex-wrap items-center gap-0.5 border-b border-[rgba(201,169,110,0.15)]">
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
        </div>
      )}

      {/* === EDITOR === */}
      <div className="flex-1 tiptap-editor">
        <EditorContent editor={editor} />
      </div>

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
          style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 16, fontWeight: 400 }}
        >
          {saving ? 'Zapisywanie...' : entry ? 'Zapisz zmiany' : 'Zapisz wpis'}
        </button>
      </div>
    </motion.div>
  )
}
