'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Wand2, Mic, MicOff } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

interface AgentChatProps {
  entryTitle: string
}

export function AgentChat({ entryTitle }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: entryTitle
        ? `Co cię skłoniło do napisania o "${entryTitle}"? Mów, nie mam całego dnia.`
        : 'Co cię skłoniło do napisania tego dzisiaj? Mów.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [focused, setFocused] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setLoading(true)
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: '...(agent zostanie podłączony)' },
      ])
      setLoading(false)
    }, 800)
  }

  const toggleRecording = () => {
    const SpeechRecognition =
      (window as typeof window & { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition

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

    recognition.onresult = (e: SpeechRecognitionEvent) => {
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
        background: '#2C0F0A',
        borderTop: '1px solid rgba(201,169,110,0.18)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-6 py-3"
        style={{ borderBottom: '1px solid rgba(201,169,110,0.1)' }}
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
          SEVERUS SNAPE
        </span>
        <span
          style={{
            fontFamily: "'Lora', serif",
            fontSize: 11,
            color: 'rgba(201,153,63,0.45)',
            fontStyle: 'italic',
            marginLeft: 4,
          }}
        >
          doradca osobisty
        </span>
      </div>

      {/* Messages */}
      <div className="px-5 py-4 flex flex-col gap-3 max-h-72 overflow-y-auto">
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
                background: m.role === 'user' ? '#C9993F' : '#3D1A10',
                color: m.role === 'user' ? '#1A0A06' : '#EAD9B8',
                border: m.role === 'user' ? 'none' : '1px solid rgba(201,169,110,0.15)',
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
                padding: '10px 18px',
                borderRadius: '14px 14px 14px 3px',
                background: '#3D1A10',
                border: '1px solid rgba(201,169,110,0.15)',
                color: '#C9993F',
                fontSize: 20,
                letterSpacing: 5,
                lineHeight: 1,
              }}
            >
              ···
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div
        className="px-5 py-3 flex gap-2 items-center"
        style={{ borderTop: '1px solid rgba(201,169,110,0.1)' }}
      >
        {/* Text input */}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Napisz do Snape'a..."
          style={{
            flex: 1,
            background: '#1A0A06',
            border: `1px solid ${focused ? 'rgba(201,153,63,0.55)' : 'rgba(201,169,110,0.22)'}`,
            borderRadius: 10,
            padding: '9px 13px',
            fontFamily: "'Lora', serif",
            fontSize: 14,
            color: '#EAD9B8',
            outline: 'none',
            transition: 'border-color 0.15s ease',
            caretColor: '#C9993F',
          }}
        />

        {/* Mic button */}
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
            border: `1px solid ${recording ? '#C9993F' : 'rgba(201,153,63,0.2)'}`,
            background: recording ? 'rgba(201,153,63,0.15)' : 'transparent',
            color: recording ? '#C9993F' : 'rgba(201,153,63,0.4)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            animation: recording ? 'micPulse 1.2s ease-in-out infinite' : 'none',
          }}
        >
          {recording ? <MicOff size={15} /> : <Mic size={15} />}
        </button>

        {/* Send button */}
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
            background: input.trim() ? 'rgba(201,153,63,0.18)' : 'transparent',
            border: `1px solid ${input.trim() ? '#C9993F' : 'rgba(201,153,63,0.2)'}`,
            borderRadius: 10,
            color: input.trim() ? '#C9993F' : 'rgba(201,153,63,0.25)',
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
        input::placeholder {
          color: rgba(201,153,63,0.3);
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
