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

// Tworzy Stripe Checkout Session dla zakupu jednego płatnego nauczyciela.
// Zwraca { url } — klient robi window.location.href = url (redirect na Stripe).
export async function POST(req: NextRequest) {
  const { agentId, accessToken } = await req.json().catch(() => ({}))

  // ── Auth: wymagany ważny token Supabase (jak w /api/chat) ─────────────────────
  const token: string | null =
    accessToken ?? req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? null
  if (!token) return jsonError('Zaloguj się, aby kupić nauczyciela.', 401)

  const db = createUserClient(token)
  const { data: { user }, error: authError } = await db.auth.getUser()
  if (authError || !user) return jsonError('Nieprawidłowy lub wygasły token.', 401)

  if (!rateLimit(`checkout:${user.id}`, 10, 60_000)) {
    return jsonError('Zbyt wiele prób — odczekaj chwilę.', 429)
  }

  // ── Walidacja produktu ────────────────────────────────────────────────────────
  if (!agentId || !isPaidAgent(agentId)) {
    return jsonError('Nieznany lub darmowy nauczyciel.', 400)
  }
  if (await ownsAgent(db, agentId)) {
    return jsonError('Masz już tego nauczyciela.', 409)
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return jsonError('Brak konfiguracji płatności (STRIPE_SECRET_KEY).', 500)
  const stripe = new Stripe(stripeKey)

  const agent = AGENT_PRICE[agentId]
  const origin = req.headers.get('origin') ?? new URL(req.url).origin

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Pozycja tworzona „w locie" — nie wymaga wcześniej założonego produktu w Stripe.
      line_items: [{
        price_data: {
          currency: agent.currency,
          unit_amount: agent.amount,
          product_data: { name: agent.name, metadata: { agent_id: agentId } },
        },
        quantity: 1,
      }],
      // client_reference_id + metadata = jak webhook przypisze zakup do usera i agenta.
      client_reference_id: user.id,
      metadata: { user_id: user.id, agent_id: agentId },
      success_url: `${origin}/?purchase=success&agent=${agentId}`,
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
