'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

type Mode = 'login' | 'register' | 'forgot'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const reset = () => { setEmail(''); setPassword(''); setMessage(null) }

  const switchMode = (m: Mode) => { setMode(m); reset() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setMessage({ text: error.message, ok: false })

      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
          setMessage({ text: error.message, ok: false })
        } else {
          setMessage({ text: 'Sprawdź skrzynkę e-mail i potwierdź konto.', ok: true })
        }

      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) {
          setMessage({ text: error.message, ok: false })
        } else {
          setMessage({ text: 'Link do resetowania hasła został wysłany.', ok: true })
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const title = mode === 'login' ? 'Zaloguj się' : mode === 'register' ? 'Utwórz konto' : 'Resetuj hasło'

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) { setMessage({ text: error.message, ok: false }); setLoading(false) }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#1A0A06' }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-3 mb-10"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Magic Diary"
          width={64}
          height={64}
          style={{ filter: 'drop-shadow(0 0 18px rgba(201,153,63,0.55))' }}
        />
        <h1
          style={{
            fontFamily: "'IM Fell English SC', serif",
            color: '#C9993F',
            fontSize: 26,
            letterSpacing: '0.12em',
          }}
        >
          Magic Diary
        </h1>
        <p style={{ fontFamily: "'Lora', serif", color: 'rgba(201,153,63,0.45)', fontSize: 13 }}>
          Twój prywatny dziennik
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm rounded-2xl p-7"
        style={{ background: '#F5EDD8', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
      >
        <h2
          className="mb-6 text-center"
          style={{ fontFamily: "'Playfair Display', serif", color: '#1A0A06', fontSize: 20 }}
        >
          {title}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label style={{ fontFamily: "'Cinzel', serif", color: '#5C3D28', fontSize: 11 }}>
              E-MAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="twoj@email.com"
              className="w-full px-4 py-3 rounded-xl outline-none border border-[rgba(201,153,63,0.3)] focus:border-[#C9993F] transition-colors"
              style={{ background: 'rgba(255,255,255,0.6)', fontFamily: "'Lora', serif", color: '#1A0A06', fontSize: 14 }}
            />
          </div>

          <AnimatePresence>
            {mode !== 'forgot' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-1.5 overflow-hidden"
              >
                <label style={{ fontFamily: "'Cinzel', serif", color: '#5C3D28', fontSize: 11 }}>
                  HASŁO
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full px-4 py-3 rounded-xl outline-none border border-[rgba(201,153,63,0.3)] focus:border-[#C9993F] transition-colors"
                  style={{ background: 'rgba(255,255,255,0.6)', fontFamily: "'Lora', serif", color: '#1A0A06', fontSize: 14 }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {message && (
            <p
              className="text-center text-sm px-2 py-2 rounded-lg"
              style={{
                fontFamily: "'Lora', serif",
                fontSize: 13,
                color: message.ok ? '#2D6A4F' : '#8B1A1A',
                background: message.ok ? 'rgba(45,106,79,0.1)' : 'rgba(139,26,26,0.1)',
              }}
            >
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl transition-all duration-200 mt-1"
            style={{
              background: loading ? 'rgba(201,153,63,0.4)' : '#C9993F',
              color: loading ? '#7A5C42' : 'white',
              fontFamily: "'Lora', serif",
              fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Chwila...' : title}
          </button>
        </form>

        {/* Google OAuth — only on login/register */}
        {mode !== 'forgot' && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="h-px flex-1" style={{ background: 'rgba(201,153,63,0.25)' }} />
              <span style={{ fontFamily: "'Cinzel', serif", color: '#9A7A5A', fontSize: 10 }}>LUB</span>
              <div className="h-px flex-1" style={{ background: 'rgba(201,153,63,0.25)' }} />
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border transition-all duration-200 hover:bg-[rgba(201,153,63,0.06)] active:scale-[0.98]"
              style={{ borderColor: 'rgba(201,153,63,0.3)', background: 'rgba(255,255,255,0.5)', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {/* Google logo SVG */}
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              <span style={{ fontFamily: "'Lora', serif", color: '#3D2B1A', fontSize: 14 }}>
                Kontynuuj z Google
              </span>
            </button>
          </>
        )}

        {/* Footer links */}
        <div className="mt-5 flex flex-col items-center gap-2">
          {mode === 'login' && (
            <>
              <button
                onClick={() => switchMode('forgot')}
                style={{ fontFamily: "'Cinzel', serif", color: '#7A5C42', fontSize: 11 }}
                className="hover:text-[#C9993F] transition-colors tracking-wide"
              >
                Zapomniałem hasła
              </button>
              <button
                onClick={() => switchMode('register')}
                style={{ fontFamily: "'Cinzel', serif", color: '#7A5C42', fontSize: 11 }}
                className="hover:text-[#C9993F] transition-colors tracking-wide"
              >
                Nie mam konta — zarejestruj się
              </button>
            </>
          )}
          {mode === 'register' && (
            <button
              onClick={() => switchMode('login')}
              style={{ fontFamily: "'Cinzel', serif", color: '#7A5C42', fontSize: 11 }}
              className="hover:text-[#C9993F] transition-colors tracking-wide"
            >
              Mam już konto — zaloguj się
            </button>
          )}
          {mode === 'forgot' && (
            <button
              onClick={() => switchMode('login')}
              style={{ fontFamily: "'Cinzel', serif", color: '#7A5C42', fontSize: 11 }}
              className="hover:text-[#C9993F] transition-colors tracking-wide"
            >
              Wróć do logowania
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
