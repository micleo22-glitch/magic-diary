'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, Mic, MicOff, Wand2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getChatMessages, saveChatMessage } from '@/lib/storage'
import { HouseTheme, DEFAULT_THEME } from '@/lib/houseTheme'
import type { Character } from './PostacieOverlay'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

const SNAPE_STANDALONE_OPENINGS = [
  'Nie mam zamiaru tracić czasu na wstępy. Mów — po co tu przyszedłeś.',
  'Zjawienie się tutaj bez kontekstu mówi już całkiem sporo. Zacznij od początku.',
  'Pozwoliłeś sobie zainicjować tę rozmowę. Widzę, że coś cię nurtuje. Mów.',
  'Kolejna dusza, która nie wie jak zacząć. Zacznę za ciebie — co chcesz powiedzieć, a boisz się powiedzieć wprost?',
  'Czekam. Nie z powodu uprzejmości — z powodu braku wyboru. Co cię tu przyprowadziło?',
]

function getStandaloneOpening(characterId: string): string {
  if (characterId === 'snape') {
    return SNAPE_STANDALONE_OPENINGS[Math.floor(Math.random() * SNAPE_STANDALONE_OPENINGS.length)]
  }
  if (characterId === 'hedwig') {
    return 'hu huu huuuu huu huuuu'
  }
  return 'Słucham.'
}

function charChatId(characterId: string): string {
  return `__char__${characterId}`
}

interface CharacterChatOverlayProps {
  character: Character
  onBack: () => void
  theme?: HouseTheme
}

export function CharacterChatOverlay({
  character,
  onBack,
  theme = DEFAULT_THEME,
}: CharacterChatOverlayProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [focused, setFocused] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  const typewriterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamBufferRef = useRef('')
  const displayedLenRef = useRef(0)
  const streamDoneRef = useRef(false)

  const stopTypewriter = () => {
    if (typewriterTimerRef.current) {
      clearTimeout(typewriterTimerRef.current)
      typewriterTimerRef.current = null
    }
  }

  const startTypewriter = (msgIndex: number, onFinish: (full: string) => void) => {
    stopTypewriter()
    displayedLenRef.current = 0
    streamDoneRef.current = false

    const tick = () => {
      const full = streamBufferRef.current
      const shown = displayedLenRef.current
      if (shown >= full.length) {
        if (streamDoneRef.current) { onFinish(full); return }
        typewriterTimerRef.current = setTimeout(tick, 30)
        return
      }
      const char = full[shown]
      displayedLenRef.current = shown + 1
      setMessages(prev => {
        const next = [...prev]
        next[msgIndex] = { role: 'assistant', text: full.slice(0, displayedLenRef.current) }
        return next
      })
      let delay = 22
      if (char === '.' || char === '!' || char === '?') delay = 260
      else if (char === '—') delay = 220
      else if (char === ',') delay = 130
      else if (char === ':' || char === ';') delay = 110
      else if (char === '\n') delay = 160
      typewriterTimerRef.current = setTimeout(tick, delay)
    }
    tick()
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token ?? null)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const chatId = charChatId(character.id)
    getChatMessages(chatId).then(history => {
      if (cancelled) return
      if (history.length > 0) {
        setMessages(history.map(m => ({ role: m.role, text: m.text })))
      } else {
        const opening = getStandaloneOpening(character.id)
        setMessages([{ role: 'assistant', text: opening }])
        saveChatMessage(chatId, 'assistant', opening)
      }
      setHistoryLoaded(true)
    })
    return () => {
      cancelled = true
      stopTypewriter()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const chatId = charChatId(character.id)
    setInput('')
    const updated = [...messages, { role: 'user' as const, text }]
    setMessages(updated)
    saveChatMessage(chatId, 'user', text)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated, teacher: character.id, accessToken }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        const errText = `Coś poszło nie tak: ${data.error ?? res.statusText}`
        setMessages(prev => [...prev, { role: 'assistant', text: errText }])
        saveChatMessage(chatId, 'assistant', errText)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let started = false
      streamBufferRef.current = ''
      streamDoneRef.current = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        streamBufferRef.current += decoder.decode(value, { stream: true })
        if (!started && streamBufferRef.current.length > 0) {
          started = true
          const msgIndex = updated.length
          setMessages(prev => [...prev, { role: 'assistant' as const, text: '' }])
          setLoading(false)
          startTypewriter(msgIndex, (fullText) => {
            if (fullText) saveChatMessage(chatId, 'assistant', fullText)
          })
        }
      }
      streamDoneRef.current = true
    } catch {
      const errText = 'Coś poszło nie tak. Spróbuj ponownie.'
      setMessages(prev => [...prev, { role: 'assistant', text: errText }])
      saveChatMessage(charChatId(character.id), 'assistant', errText)
    } finally {
      setLoading(false)
    }
  }

  const toggleRecording = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognition) return
    if (recording) { recognitionRef.current?.stop(); setRecording(false); return }
    const recognition = new SpeechRecognition()
    recognition.lang = 'pl-PL'
    recognition.continuous = false
    recognition.interimResults = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setInput(prev => prev ? `${prev} ${transcript}` : transcript)
    }
    recognition.onend = () => setRecording(false)
    recognition.onerror = () => setRecording(false)
    recognitionRef.current = recognition
    recognition.start()
    setRecording(true)
  }

  const CharIcon = character.Icon

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col"
      style={{
        background: theme.sidebarBg ?? 'linear-gradient(180deg, #2C0F0A 0%, #1A0A06 100%)',
        transition: 'background 0.4s ease',
      }}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {/* Header — back + character identity (matches AgentChat pattern) */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: `1px solid ${theme.borderColor}` }}
      >
        {/* Back button */}
        <button
          onClick={onBack}
          className="p-3 -ml-2 rounded-xl transition-colors hover:bg-[rgba(201,153,63,0.08)]"
          style={{ color: 'rgba(201,153,63,0.7)', minWidth: 44, minHeight: 44 }}
          aria-label="Wróć do listy postaci"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: theme.borderColor }} />

        {/* Wand icon + character name — same as AgentChat header */}
        <Wand2 size={13} className="md:w-4 md:h-4" style={{ color: '#C9993F' }} />
        <span
          className="text-[10px] md:text-[13px]"
          style={{
            fontFamily: "'Cinzel', serif",
            color: '#C9993F',
            letterSpacing: '0.15em',
          }}
        >
          {character.name.toUpperCase()}
        </span>

        {/* Character icon — top-right, subtle */}
        <div className="ml-auto">
          <CharIcon size={15} className="md:w-5 md:h-5" style={{ color: 'rgba(201,153,63,0.5)' }} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {!historyLoaded && (
          <div className="flex justify-center py-8">
            <span
              className="text-[13px] md:text-[15px]"
              style={{
                fontFamily: "'Lora', serif",
                color: 'rgba(201,153,63,0.5)',
                fontStyle: 'italic',
              }}
            >
              Wczytywanie...
            </span>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              style={{
                maxWidth: '78%',
                fontFamily: "'Lora', serif",
                fontSize: 14,
                lineHeight: 1.65,
                padding: '10px 14px',
                borderRadius: m.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                background: m.role === 'user' ? theme.primary : 'rgba(255,255,255,0.05)',
                color: m.role === 'user' ? '#1A0A06' : '#EAD9B8',
                border: m.role === 'user' ? 'none' : `1px solid ${theme.borderColor}`,
              }}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              style={{
                padding: '10px 16px',
                borderRadius: '14px 14px 14px 3px',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${theme.borderColor}`,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: theme.primary,
                    animation: 'charPulse 1.4s ease-in-out infinite',
                    animationDelay: `${i * 0.22}s`,
                    opacity: 0.3,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input — identical to AgentChat */}
      <div
        className="px-5 py-3 flex gap-2 items-center"
        style={{
          borderTop: `1px solid ${theme.borderColor}`,
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={`Napisz do ${character.name.split(' ').pop()}...`}
          style={{
            flex: 1,
            background: 'rgba(0,0,0,0.25)',
            border: `1px solid ${focused ? theme.primary : theme.borderColor}`,
            borderRadius: 10,
            padding: '11px 13px',
            fontFamily: "'Lora', serif",
            fontSize: 14,
            color: '#EAD9B8',
            outline: 'none',
            transition: 'border-color 0.15s ease',
            caretColor: theme.primary,
          }}
        />

        <button
          onClick={toggleRecording}
          aria-label={recording ? 'Zatrzymaj nagrywanie' : 'Dyktuj głosem'}
          style={{
            flexShrink: 0,
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            border: `1px solid ${recording ? theme.primary : theme.borderColor}`,
            background: recording ? theme.primaryDim : 'transparent',
            color: recording ? theme.primary : 'rgba(201,153,63,0.55)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            animation: recording ? 'micPulse 1.2s ease-in-out infinite' : 'none',
          }}
        >
          {recording ? <MicOff size={15} /> : <Mic size={15} />}
        </button>

        <button
          onClick={send}
          disabled={!input.trim() || loading}
          aria-label="Wyślij"
          style={{
            flexShrink: 0,
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: input.trim() ? theme.primaryDim : 'transparent',
            border: `1px solid ${input.trim() ? theme.primary : theme.borderColor}`,
            borderRadius: 10,
            color: input.trim() ? theme.primary : 'rgba(201,153,63,0.3)',
            cursor: input.trim() ? 'pointer' : 'default',
            transition: 'all 0.15s ease',
          }}
        >
          <Send size={14} />
        </button>
      </div>

      <style>{`
        @keyframes micPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,153,63,0.3); }
          50% { box-shadow: 0 0 0 5px rgba(201,153,63,0); }
        }
        @keyframes charPulse {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        input::placeholder { color: rgba(201,153,63,0.3); font-style: italic; }
      `}</style>
    </motion.div>
  )
}
