'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Wand2, Mic, MicOff } from 'lucide-react'
import { Entry } from '@/types/entry'
import { supabase } from '@/lib/supabase'
import { HouseTheme, DEFAULT_THEME } from '@/lib/houseTheme'
import { getChatMessages, saveChatMessage } from '@/lib/storage'

const AGENT_LABELS: Record<string, { header: string; placeholder: string }> = {
  snape: { header: 'SEVERUS SNAPE', placeholder: "Napisz do Snape'a..." },
  hedwig: { header: 'HEDWIGA', placeholder: 'Napisz do Hedwigi...' },
}

interface Message {
  role: 'user' | 'assistant'
  text: string
}

interface AgentChatProps {
  entry: Entry
  theme?: HouseTheme
  teacher?: string
}

type MoodFn = (title: string, mood: number | null) => string

const OPENING_WITH_TITLE: MoodFn[] = [
  // cytuje tytuł (5)
  (t) => `"${t}"... Może chciałbyś mi się z tego wytłumaczyć?`,
  (t) => `"${t}"... Interesujący tytuł. Co tak naprawdę chciałeś przez to powiedzieć?`,
  (t) => `"${t}"... Napisałeś to. Ja czytam między wierszami. Mów.`,
  (t) => `"${t}"... Hmm. Nie spodziewałem się, że aż do tego zajdziemy. Słucham.`,
  (t) => `"${t}"... Cóż za odkrywczy tytuł. Zatem — co kryje się za tym słowem?`,
  // reaguje na nastrój, ignoruje tytuł (5)
  (_t, m) => m && m <= 2
    ? 'Widzę, że coś ci ciąży. Nie mam zamiaru czekać — mów.'
    : m && m >= 4
    ? 'Rzadko widzę u ciebie coś pozytywnego. Ciekawe, czy to trwałe. Mów.'
    : 'Kolejny dzień, kolejny wpis. Co tym razem chcesz mi powiedzieć?',
  (_t, m) => m && m <= 2
    ? 'Nie musisz udawać, że jest dobrze. Ja widzę inaczej. Zacznij mówić.'
    : m && m >= 4
    ? 'Dobre samopoczucie. Rzadkość. Co za tym stoi?'
    : 'To, co napisałeś, mówi więcej niż myślisz. Zacznijmy od początku.',
  (_t, m) => m && m <= 2
    ? 'Piszesz, kiedy jest źle. To mówi samo za siebie. Co się stało?'
    : m && m >= 4
    ? 'Widzę, że dziś jest lepiej. Powiedz mi — skąd ta zmiana?'
    : 'Emocje masz ukryte głęboko. Ale nie ode mnie. Zacznij.',
  () => 'Napisałeś. Teraz czas na rozmowę — czy tego chciałeś, czy nie.',
  () => 'Coś cię skłoniło do napisania tego. Nie wierzę w przypadki. Słucham.',
]

type MoodFnNoTitle = (mood: number | null) => string

const OPENING_WITHOUT_TITLE: MoodFnNoTitle[] = [
  () => 'Napisałeś to. Słucham — może chciałbyś mi się z tego wytłumaczyć?',
  () => 'Bez tytułu. Charakterystyczne. Mów — co cię do tego skłoniło?',
  () => 'Nie zadałeś sobie nawet trudu, by to nazwać. Mimo to — słucham.',
  () => 'Kolejny wpis bez tytułu. Nie mam zamiaru się domyślać. Zacznij mówić.',
  (m) => m && m <= 2
    ? 'Piszesz, bo coś boli. Nie musisz tego ukrywać. Mów.'
    : m && m >= 4
    ? 'Dobry nastrój, brak tytułu. Ciekawe połączenie. Słucham.'
    : 'Więc coś napisałeś. Wątpię, by to był przypadek. Słucham cię.',
]

const OPENING_LINE = (title: string, mood: number | null) => {
  if (title) {
    const fn = OPENING_WITH_TITLE[Math.floor(Math.random() * OPENING_WITH_TITLE.length)]
    return fn(title, mood)
  }
  const fn = OPENING_WITHOUT_TITLE[Math.floor(Math.random() * OPENING_WITHOUT_TITLE.length)]
  return fn(mood)
}

export function AgentChat({ entry, theme = DEFAULT_THEME, teacher = 'snape' }: AgentChatProps) {
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

  // Typewriter state
  const typewriterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamBufferRef = useRef('')   // full text received from stream
  const displayedLenRef = useRef(0)    // how many chars are shown so far
  const streamDoneRef = useRef(false)  // has the stream finished?

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

      // Nothing new yet — wait
      if (shown >= full.length) {
        if (streamDoneRef.current) {
          onFinish(full)
          return
        }
        typewriterTimerRef.current = setTimeout(tick, 30)
        return
      }

      const char = full[shown]
      displayedLenRef.current = shown + 1
      const newText = full.slice(0, displayedLenRef.current)

      setMessages(prev => {
        const next = [...prev]
        next[msgIndex] = { role: 'assistant', text: newText }
        return next
      })

      // Dramatic Snape pauses
      let delay = 22
      if (char === '.' || char === '!' || char === '?') delay = 260
      else if (char === '—') delay = 220
      else if (char === ',') delay = 130
      else if (char === ':' || char === ';') delay = 110
      else if (char === '\n') delay = 160
      // "..." — already covered per-dot above (each dot = 260ms)

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
    getChatMessages(entry.id).then(history => {
      if (cancelled) return
      if (history.length > 0) {
        setMessages(history.map(m => ({ role: m.role, text: m.text })))
      } else {
        const opening = teacher === 'hedwig'
          ? 'hu huu huuuu huu huuuu'
          : OPENING_LINE(entry.title, entry.mood ?? null)
        setMessages([{ role: 'assistant', text: opening }])
        saveChatMessage(entry.id, 'assistant', opening)
      }
      setHistoryLoaded(true)
    })
    return () => {
      cancelled = true
      stopTypewriter()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.id])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const updated = [...messages, { role: 'user' as const, text }]
    setMessages(updated)
    saveChatMessage(entry.id, 'user', text)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated,
          entry: {
            title: entry.title,
            content: entry.content,
            mood: entry.mood,
            date: entry.date,
          },
          accessToken,
          teacher,
        }),
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        const errText = `Coś poszło nie tak: ${data.error ?? res.statusText}`
        setMessages(prev => [...prev, { role: 'assistant', text: errText }])
        saveChatMessage(entry.id, 'assistant', errText)
        return
      }

      // Drain stream into buffer; show bubble only on first token
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      const entryId = entry.id
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
            if (fullText) saveChatMessage(entryId, 'assistant', fullText)
          })
        }
      }
      streamDoneRef.current = true
    } catch {
      const errText = 'Coś poszło nie tak. Spróbuj ponownie.'
      setMessages(prev => [...prev, { role: 'assistant', text: errText }])
      saveChatMessage(entry.id, 'assistant', errText)
    } finally {
      setLoading(false)
    }
  }

  const toggleRecording = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SpeechRecognition) return

    if (recording) {
      recognitionRef.current?.stop()
      setRecording(false)
      return
    }

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

  return (
    <div
      style={{
        background: theme.navBg,
        borderTop: `1px solid ${theme.borderColor}`,
        transition: 'background 0.4s ease',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-6 py-3"
        style={{ borderBottom: `1px solid ${theme.borderColor}` }}
      >
        <Wand2 size={13} style={{ color: '#C9993F' }} />
        <span
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 10,
            color: '#C9993F',
            letterSpacing: '0.15em',
          }}
        >
          {(AGENT_LABELS[teacher] ?? AGENT_LABELS.snape).header}
        </span>
      </div>

      {/* Messages */}
      <div className="px-5 py-4 flex flex-col gap-3 max-h-72 overflow-y-auto">
        {!historyLoaded && (
          <div className="flex justify-center py-4">
            <span style={{ fontFamily: "'Lora', serif", fontSize: 13, color: 'rgba(201,153,63,0.4)', fontStyle: 'italic' }}>
              Wczytywanie historii...
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
                    animation: 'snapePulse 1.4s ease-in-out infinite',
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

      {/* Input row */}
      <div
        className="px-5 py-3 flex gap-2 items-center"
        style={{ borderTop: `1px solid ${theme.borderColor}` }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={(AGENT_LABELS[teacher] ?? AGENT_LABELS.snape).placeholder}
          style={{
            flex: 1,
            background: 'rgba(0,0,0,0.25)',
            border: `1px solid ${focused ? theme.primary : theme.borderColor}`,
            borderRadius: 10,
            padding: '9px 13px',
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
          title={recording ? 'Zatrzymaj' : 'Dyktuj głosem'}
          style={{
            flexShrink: 0,
            width: 38,
            height: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            border: `1px solid ${recording ? theme.primary : theme.borderColor}`,
            background: recording ? theme.primaryDim : 'transparent',
            color: recording ? theme.primary : theme.borderColor,
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
          aria-label="Wyślij wiadomość"
          style={{
            flexShrink: 0,
            width: 38,
            height: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: input.trim() ? theme.primaryDim : 'transparent',
            border: `1px solid ${input.trim() ? theme.primary : theme.borderColor}`,
            borderRadius: 10,
            color: input.trim() ? theme.primary : theme.borderColor,
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
        @keyframes snapePulse {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        input::placeholder {
          color: rgba(201,153,63,0.3);
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
