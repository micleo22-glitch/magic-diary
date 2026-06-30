'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

let posthogInitialized = false

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (posthogInitialized) return

    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'

    if (!posthogKey) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('PostHog disabled: NEXT_PUBLIC_POSTHOG_KEY is not configured')
      }
      return
    }

    posthog.init(posthogKey, {
      api_host: posthogHost,
      ui_host: 'https://eu.posthog.com',
      capture_pageview: 'history_change',
      capture_pageleave: true,
    })

    posthogInitialized = true
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
