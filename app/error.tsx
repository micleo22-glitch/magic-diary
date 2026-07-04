'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    posthog.captureException(error, {
      digest: error.digest,
      source: 'next-app-error-boundary',
    })
  }, [error])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#1A0A06] px-6 text-white">
      <section className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold">Cos poszlo nie tak</h1>
        <p className="mt-3 text-sm text-white/70">
          Zapisalismy blad i mozesz sprobowac wrocic do pamietnika.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-md bg-[#F6C85F] px-4 py-2 text-sm font-semibold text-[#1A0A06] transition hover:bg-[#ffd978]"
        >
          Sprobuj ponownie
        </button>
      </section>
    </main>
  )
}
