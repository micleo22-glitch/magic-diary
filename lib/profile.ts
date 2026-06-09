import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'

// Profile (username, house, onboarding state) lives in Supabase `user_metadata`,
// so it follows the account across devices / browsers / incognito.
// localStorage is kept only as a cache for instant first paint.

export interface Profile {
  username: string
  house: string
  onboardingDone: boolean
  defaultAgent: string
}

const LS_NAME   = 'magic_diary_username'
const LS_HOUSE  = 'magic_diary_house'
const LS_DONE   = 'magic_diary_onboarding_done'
const LS_AGENT  = 'magic_diary_default_agent'

const EMPTY: Profile = { username: '', house: '', onboardingDone: false, defaultAgent: '' }

/** Read the authoritative profile straight from the session's user metadata (pure). */
export function profileFromSession(session: Session | null): Profile {
  const m = (session?.user?.user_metadata ?? {}) as Record<string, unknown>
  return {
    username: typeof m.username === 'string' ? m.username : '',
    house: typeof m.house === 'string' ? m.house : '',
    onboardingDone: m.onboarding_done === true,
    defaultAgent: typeof m.default_agent === 'string' ? m.default_agent : '',
  }
}

/** Cached values from localStorage — used only for first paint before the session resolves. */
export function getCachedProfile(): Partial<Profile> {
  if (typeof window === 'undefined') return {}
  return {
    username: localStorage.getItem(LS_NAME) ?? '',
    house: localStorage.getItem(LS_HOUSE) ?? '',
    onboardingDone: localStorage.getItem(LS_DONE) === '1',
    defaultAgent: localStorage.getItem(LS_AGENT) ?? '',
  }
}

/**
 * Persist a partial profile change to user_metadata (merged) + refresh the cache.
 * The cache is written first so the value is never lost even if the network call fails.
 * Returns whether the account write succeeded.
 */
export async function saveProfile(patch: Partial<Profile>): Promise<boolean> {
  cacheProfile(patch)

  const data: Record<string, unknown> = {}
  if (patch.username !== undefined)       data.username = patch.username
  if (patch.house !== undefined)          data.house = patch.house
  if (patch.onboardingDone !== undefined) data.onboarding_done = patch.onboardingDone
  if (patch.defaultAgent !== undefined)   data.default_agent = patch.defaultAgent

  const { error } = await supabase.auth.updateUser({ data })
  if (error) { console.error('saveProfile failed:', error); return false }
  return true
}

/** Write profile values to the localStorage cache (used for instant first paint). */
export function cacheProfile(p: Partial<Profile>) {
  if (typeof window === 'undefined') return
  if (p.username !== undefined)       localStorage.setItem(LS_NAME, p.username)
  if (p.house !== undefined)          localStorage.setItem(LS_HOUSE, p.house)
  if (p.onboardingDone !== undefined) localStorage.setItem(LS_DONE, p.onboardingDone ? '1' : '0')
  if (p.defaultAgent !== undefined)   localStorage.setItem(LS_AGENT, p.defaultAgent)
}

/**
 * Drop the cached profile. Called on sign-out so a different account logging in
 * on the same browser never inherits the previous user's name/house.
 */
export function clearCachedProfile() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(LS_NAME)
  localStorage.removeItem(LS_HOUSE)
  localStorage.removeItem(LS_DONE)
  localStorage.removeItem(LS_AGENT)
}

export { EMPTY as EMPTY_PROFILE }
