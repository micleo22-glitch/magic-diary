'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Info } from 'lucide-react'
import { setToastListener } from '@/lib/toast'

interface ToastItem {
  id: number
  msg: string
  type: 'success' | 'error' | 'info'
}

let _id = 0

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    setToastListener((msg, type) => {
      const id = _id++
      setToasts(prev => [...prev, { id, msg, type }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 3000)
    })
  }, [])

  const icons = {
    success: <CheckCircle size={15} />,
    error: <XCircle size={15} />,
    info: <Info size={15} />,
  }

  const colors = {
    success: { bg: 'rgba(12,26,18,0.88)', border: 'rgba(46,173,110,0.45)', text: '#4FD695' },
    error:   { bg: 'rgba(28,10,8,0.88)',  border: 'rgba(224,85,85,0.45)',  text: '#F07B7B' },
    info:    { bg: 'rgba(26,16,6,0.88)',  border: 'rgba(201,153,63,0.45)', text: '#E8C87E' },
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none items-center"
    >
      <AnimatePresence>
        {toasts.map(t => {
          const c = colors[t.type]
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-xl"
              style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                backdropFilter: 'blur(12px)',
                color: c.text,
                fontFamily: "'Cinzel', serif",
                fontSize: 12,
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
              }}
            >
              {icons[t.type]}
              {t.msg}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
