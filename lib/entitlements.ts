import { supabase } from './supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

// Kto którego płatnego nauczyciela posiada. Tabela `entitlements` w Supabase,
// pisana przez webhook Stripe (service-role), czytana przez usera (RLS = własne wiersze).

/** Klient (przeglądarka): id posiadanych płatnych agentów. RLS zawęża do zalogowanego usera. */
export async function fetchEntitlements(): Promise<string[]> {
  const { data, error } = await supabase.from('entitlements').select('agent_id')
  if (error) {
    console.error('fetchEntitlements:', error.message)
    return []
  }
  return (data ?? []).map((r) => r.agent_id as string)
}

/** Serwer: czy dany user (przez jego RLS-owy klient) posiada danego agenta? */
export async function ownsAgent(db: SupabaseClient, agentId: string): Promise<boolean> {
  const { data, error } = await db
    .from('entitlements')
    .select('agent_id')
    .eq('agent_id', agentId)
    .maybeSingle()
  if (error) {
    console.error('ownsAgent:', error.message)
    return false
  }
  return !!data
}
