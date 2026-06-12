'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SplashScreenProps {
  onDone: () => void
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 1400)
    return () => clearTimeout(t)
  }, [onDone])

  const particles = Array.from({ length: 24 }).map((_, i) => ({
    id: i,
    x: 10 + Math.random() * 80,
    y: 10 + Math.random() * 80,
    size: 1 + Math.random() * 3.5,
    dur: 2 + Math.random() * 3,
    delay: Math.random() * 2.5,
  }))

  return (
    <motion.div
      className="app-bg fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#1A0A06' }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              background: '#F0C96A',
            }}
            animate={{ opacity: [0, 1, 0], y: [0, -40, -80], scale: [1, 1.2, 0] }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}
      </div>

      {/* Logo + title */}
      <motion.div
        className="relative flex flex-col items-center gap-5 z-10"
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.85, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {/* Logo image */}
        <div
          className="relative"
          style={{
            width: 180,
            height: 180,
            filter: 'drop-shadow(0 0 32px rgba(201,153,63,0.55))',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Magic Diary"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* Tagline */}
        <motion.p
          className="text-center tracking-widest uppercase leading-relaxed"
          style={{
            fontFamily: "'IM Fell English SC', serif",
            color: 'rgba(201,153,63,0.85)',
            fontSize: 20,
            letterSpacing: '0.18em',
            lineHeight: 1.55,
          }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          Twoje czarodziejskie<br />wspomnienia
        </motion.p>
      </motion.div>

      {/* Loading bar */}
      <motion.div
        className="absolute bottom-14 rounded-full"
        style={{ height: 1, background: '#C9993F' }}
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 130, opacity: [0, 0.8, 0.4] }}
        transition={{ duration: 1.4, ease: 'easeInOut' }}
      />
    </motion.div>
  )
}
