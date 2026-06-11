'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Feather } from 'lucide-react'

const HOUSES = [
  { id: 'gryffindor', name: 'Gryffindor', emoji: '🦁', color: '#C41E3A', bg: 'rgba(196,30,58,0.15)', desc: 'Odwaga i szlachetność' },
  { id: 'slytherin',  name: 'Slytherin',  emoji: '🐍', color: '#2EAD6E', bg: 'rgba(46,173,110,0.12)',  desc: 'Ambicja i przebiegłość' },
  { id: 'hufflepuff', name: 'Hufflepuff', emoji: '🦡', color: '#ECB939', bg: 'rgba(236,185,57,0.15)', desc: 'Cierpliwość i lojalność' },
  { id: 'ravenclaw',  name: 'Ravenclaw',  emoji: '🐦‍⬛', color: '#5B8DD9', bg: 'rgba(91,141,217,0.15)', desc: 'Mądrość i pomysłowość' },
]

interface OnboardingProps {
  onDone: (username: string, house: string) => void
}

export function Onboarding({ onDone }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [house, setHouse] = useState('')
  const [name, setName] = useState('')

  const houseData = HOUSES.find(h => h.id === house)

  function finish() {
    localStorage.setItem('magic_diary_onboarding_done', '1')
    if (name.trim()) localStorage.setItem('magic_diary_username', name.trim())
    if (house) localStorage.setItem('magic_diary_house', house)
    onDone(name.trim(), house)
  }

  const steps = [
    // Step 0: House selection
    <motion.div key="house" className="flex flex-col items-center gap-6 w-full">
      <div className="text-center">
        <p style={{ fontFamily: "'IM Fell English SC', serif", color: 'rgba(201,153,63,0.6)', fontSize: 12, letterSpacing: '0.14em' }}
          className="mb-2 uppercase">Krok 1 z 3</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#C9993F', fontSize: 26 }}
          className="mb-2 leading-snug">
          Wybierz swój Dom
        </h2>
        <p style={{ fontFamily: "'Lora', serif", color: '#7A5C42', fontSize: 14 }}>
          Każdy mag należy do jednego z czterech domów Hogwartu.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {HOUSES.map(h => {
          const sel = house === h.id
          return (
            <button
              key={h.id}
              onClick={() => setHouse(h.id)}
              className="flex flex-col items-center gap-2 py-5 px-3 rounded-2xl border-2 transition-all duration-200 active:scale-[0.97]"
              style={{
                borderColor: sel ? h.color : 'rgba(201,153,63,0.12)',
                background: sel ? h.bg : 'rgba(255,255,255,0.02)',
              }}
            >
              <span style={{ fontSize: 32 }}>{h.emoji}</span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: sel ? h.color : 'rgba(201,153,63,0.55)', letterSpacing: '0.06em' }}>
                {h.name}
              </span>
              <span style={{ fontFamily: "'Lora', serif", fontSize: 10, color: sel ? h.color : 'rgba(201,153,63,0.35)', textAlign: 'center' }}>
                {h.desc}
              </span>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => house && setStep(1)}
        disabled={!house}
        className="flex items-center gap-2 px-8 py-3 rounded-2xl transition-all duration-200 active:scale-[0.98]"
        style={{
          background: house ? '#C9993F' : 'rgba(201,153,63,0.15)',
          color: house ? '#1A0A06' : 'rgba(201,153,63,0.3)',
          fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: '0.08em',
        }}
      >
        Dalej
        <ChevronRight size={14} />
      </button>
    </motion.div>,

    // Step 1: Name
    <motion.div key="name" className="flex flex-col items-center gap-6 w-full">
      {houseData && (
        <div className="text-center">
          <span style={{ fontSize: 48 }}>{houseData.emoji}</span>
        </div>
      )}
      <div className="text-center">
        <p style={{ fontFamily: "'IM Fell English SC', serif", color: 'rgba(201,153,63,0.6)', fontSize: 12, letterSpacing: '0.14em' }}
          className="mb-2 uppercase">Krok 2 z 3</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#C9993F', fontSize: 26 }}
          className="mb-2">Jak masz na imię?</h2>
        <p style={{ fontFamily: "'Lora', serif", color: '#7A5C42', fontSize: 14 }}>
          Możesz użyć pseudonimu — tylko Ty widzisz swój dziennik.
        </p>
      </div>

      <div className="w-full max-w-xs">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && setStep(2)}
          placeholder="Twoje imię lub pseudonim..."
          maxLength={40}
          autoFocus
          style={{ fontFamily: "'Lora', serif", fontSize: 16, background: 'rgba(255,255,255,0.05)' }}
          className="w-full px-5 py-4 rounded-2xl border border-[rgba(201,153,63,0.25)] text-[#D4A96A] placeholder:text-[#7A5C42]/40 outline-none focus:border-[#C9993F]/60 transition-colors text-center"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setStep(0)}
          style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: 'rgba(201,153,63,0.5)', letterSpacing: '0.06em' }}
          className="px-5 py-2.5 rounded-xl border border-[rgba(201,153,63,0.15)] hover:border-[rgba(201,153,63,0.3)] transition-colors"
        >
          Wróć
        </button>
        <button
          onClick={() => setStep(2)}
          className="flex items-center gap-2 px-8 py-2.5 rounded-2xl transition-all"
          style={{
            background: '#C9993F', color: '#1A0A06',
            fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: '0.08em',
          }}
        >
          {name.trim() ? 'Dalej' : 'Pomiń'}
          <ChevronRight size={14} />
        </button>
      </div>
    </motion.div>,

    // Step 2: Ready
    <motion.div key="done" className="flex flex-col items-center gap-6 w-full"
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="text-center">
        <p style={{ fontFamily: "'IM Fell English SC', serif", color: 'rgba(201,153,63,0.6)', fontSize: 12, letterSpacing: '0.14em' }}
          className="mb-2 uppercase">Krok 3 z 3</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: '#C9993F', fontSize: 26 }}
          className="mb-3 leading-snug">
          {name.trim() ? `Witaj, ${name.trim()}!` : 'Witaj, młody magu!'}
        </h2>
        {houseData && (
          <p style={{ fontFamily: "'Lora', serif", color: houseData.color, fontSize: 15 }} className="mb-1">
            {houseData.emoji} Dom {houseData.name}
          </p>
        )}
        <p style={{ fontFamily: "'Lora', serif", color: '#7A5C42', fontSize: 14, lineHeight: 1.7 }}>
          Twój magiczny dziennik jest gotowy.<br />
          Zapisuj wspomnienia, myśli i przygody.
        </p>
      </div>

      <div className="flex justify-center" style={{ opacity: 0.4 }}>
        <svg width="48" height="60" viewBox="0 0 64 80" fill="none">
          <path d="M32 4 C20 12, 6 24, 4 44 C6 60, 18 70, 32 72 C46 70, 58 60, 60 44 C58 24, 44 12, 32 4Z"
            stroke="#C9993F" strokeWidth="1.5" fill="none" />
          <path d="M32 4 L32 72" stroke="#C9993F" strokeWidth="0.8" />
          <path d="M32 20 Q44 30, 55 35" stroke="#C9993F" strokeWidth="0.6" fill="none" />
          <path d="M32 32 Q44 40, 52 46" stroke="#C9993F" strokeWidth="0.6" fill="none" />
          <path d="M32 20 Q20 30, 9 35" stroke="#C9993F" strokeWidth="0.6" fill="none" />
          <path d="M32 32 Q20 40, 12 46" stroke="#C9993F" strokeWidth="0.6" fill="none" />
        </svg>
      </div>

      <button
        onClick={finish}
        className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl transition-all active:scale-[0.98] shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #C9993F 0%, #D4A84A 100%)',
          color: '#1A0A06',
          fontFamily: "'Cinzel', serif", fontSize: 13, letterSpacing: '0.1em',
        }}
      >
        <Feather size={15} />
        Napisz pierwszy wpis
      </button>
    </motion.div>,
  ]

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-6"
      style={{ background: 'linear-gradient(180deg, #1A0A06 0%, #2C0F0A 100%)' }}>
      {/* Decorative particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div key={i}
            className="absolute rounded-full"
            style={{
              left: `${10 + (i * 7.5) % 85}%`,
              top: `${15 + (i * 11) % 70}%`,
              width: 2 + (i % 3),
              height: 2 + (i % 3),
              background: '#C9993F',
            }}
            animate={{ opacity: [0, 0.6, 0], y: [0, -30, -60] }}
            transition={{ duration: 3 + i % 2, delay: i * 0.3, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Logo */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" width={28} height={28} style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(201,153,63,0.5))' }} />
        <span style={{ fontFamily: "'IM Fell English SC', serif", color: '#C9993F', fontSize: 16, letterSpacing: '0.1em' }}>
          Magic Diary
        </span>
      </div>

      {/* Step content */}
      <div className="w-full max-w-sm flex flex-col items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full flex flex-col items-center"
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step dots */}
      <div className="absolute bottom-10 flex gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-full transition-all duration-200"
            style={{
              width: i === step ? 20 : 6,
              height: 6,
              background: i === step ? '#C9993F' : 'rgba(201,153,63,0.2)',
            }} />
        ))}
      </div>
    </div>
  )
}
