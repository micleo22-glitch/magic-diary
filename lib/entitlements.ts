import { supabase } from './supabase'
import { getStrapiEntitlement } from './strapi'

// Kto którego płatnego nauczyciela posiada.
// Strapi jest źródłem prawdy. Supabase `entitlements` może być tylko cachem/RLS-owym lustrem.

/** Klient (przeglądarka): id posiadanych płatnych agentów przez serwerowy proxy do Strapi. */
export async function fetchEntitlements(): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) return []

  const res = await fetch('/api/entitlements', {
    headers: { Authorization: `Bearer ${token}` },
  }).catch((error) => {
    console.error('fetchEntitlements:', error)
    return null
  })

  if (!res?.ok) {
    console.error('fetchEntitlements:', res?.statusText ?? 'request failed')
    return []
  }

  const data = await res.json().catch(() => ({}))
  return Array.isArray(data.agentIds) ? data.agentIds : []
}

/** Serwer: czy dany user posiada danego agenta według Strapi. Rzuca błąd, gdy Strapi nie odpowiada. */
export async function ownsAgent(userId: string, agentId: string): Promise<boolean> {
  return Boolean(await getStrapiEntitlement(userId, agentId))
}
