// Lightweight in-memory rate limiter.
//
// NOTE: on serverless (Vercel) the process memory is per-instance and not
// shared across cold starts or concurrent lambdas, so this is a best-effort
// second layer only. The PRIMARY control against abuse is requiring a valid
// auth token on the route. For hard, distributed guarantees swap this for a
// shared store (e.g. Upstash/Redis).

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/**
 * Returns true if the call is allowed, false if the limit was exceeded.
 * @param key       unique caller key (e.g. `chat:<userId>`)
 * @param limit     max calls allowed within the window
 * @param windowMs  window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const b = buckets.get(key)

  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    // Opportunistic cleanup so the map can't grow unbounded.
    if (buckets.size > 5000) {
      buckets.forEach((v, k) => { if (now > v.resetAt) buckets.delete(k) })
    }
    return true
  }

  if (b.count >= limit) return false
  b.count++
  return true
}
