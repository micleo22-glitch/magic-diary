import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { createUserClient } from '@/lib/supabase-admin'
import { AGENT_PRICE, isPaidAgent } from '@/lib/agents'
import { ownsAgent } from '@/lib/entitlements'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Tworzy Stripe Checkout Session dla zakupu jednego lub wielu nauczycieli.
// Przyjmuje { agentIds: string[], accessToken } — zwraca { url }.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))

  // Obsługa zarówno nowego agentIds[] jak i starego agentId (backward compat)
  const agentIds: string[] = Array.isArray(body.agentIds)
    ? body.agentIds
    : body.agentId
    ? [body.agentId]
    : []

  const accessToken: string | null =
    body.accessToken ?? req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? null

  if (!accessToken) return jsonError('Zaloguj się, aby kupić nauczyciela.', 401)

  const db = createUserClient(accessToken)
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return jsonError('Nieprawidłowy lub wygasły token.', 401)

  if (!rateLimit(`checkout:${user.id}`, 10, 60_000)) {
    return jsonError('Zbyt wiele prób — odczekaj chwilę.', 429)
  }

  if (!agentIds.length) return jsonError('Nie wybrano żadnego nauczyciela.', 400)

  // Walidacja każdego agenta
  for (const id of agentIds) {
    if (!isPaidAgent(id)) return jsonError(`Nieznany lub darmowy nauczyciel: ${id}.`, 400)
    if (await ownsAgent(db, id)) return jsonError(`Masz już tego nauczyciela: ${id}.`, 409)
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return jsonError('Brak konfiguracji płatności (STRIPE_SECRET_KEY).', 500)
  const stripe = new Stripe(stripeKey)

  const origin = req.headers.get('origin') ?? new URL(req.url).origin

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: agentIds.map(id => ({
        price_data: {
          currency: AGENT_PRICE[id].currency,
          unit_amount: AGENT_PRICE[id].amount,
          product_data: { name: AGENT_PRICE[id].name, metadata: { agent_id: id } },
        },
        quantity: 1,
      })),
      client_reference_id: user.id,
      // agent_ids = comma-separated lista, webhook ją parsuje
      metadata: { user_id: user.id, agent_ids: agentIds.join(',') },
      success_url: `${origin}/?purchase=success&agents=${agentIds.join(',')}`,
      cancel_url: `${origin}/?purchase=cancel`,
      locale: 'pl',
      customer_email: user.email ?? undefined,
    })
    return new Response(JSON.stringify({ url: checkout.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[checkout] stripe error:', e)
    return jsonError('Nie udało się utworzyć płatności.', 502)
  }
}
