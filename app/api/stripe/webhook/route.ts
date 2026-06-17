import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase-admin'

// Stripe SDK wymaga Node (nie Edge); potrzebny też surowy body do weryfikacji podpisu.
export const runtime = 'nodejs'

// Webhook Stripe = ŹRÓDŁO PRAWDY o zakupie. Bez auth — bezpieczeństwo opiera się na
// weryfikacji podpisu (STRIPE_WEBHOOK_SECRET). Na `checkout.session.completed` zapisuje
// entitlement kluczem service-role (omija RLS). Idempotentny — Stripe ponawia próby.
export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripeKey || !webhookSecret) {
    console.error('[webhook] brak STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET')
    return new Response('Server misconfigured', { status: 500 })
  }
  const stripe = new Stripe(stripeKey)

  const sig = req.headers.get('stripe-signature')
  if (!sig) return new Response('Brak podpisu', { status: 400 })

  const rawBody = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (e) {
    console.error('[webhook] zła weryfikacja podpisu:', e instanceof Error ? e.message : e)
    return new Response('Zły podpis', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    if (session.payment_status === 'paid') {
      const userId = session.metadata?.user_id ?? session.client_reference_id ?? null
      const agentId = session.metadata?.agent_id ?? null

      if (userId && agentId) {
        try {
          const svc = createServiceClient()
          const { error } = await svc.from('entitlements').upsert(
            {
              user_id: userId,
              agent_id: agentId,
              source: 'stripe',
              stripe_session_id: session.id,
            },
            { onConflict: 'user_id,agent_id', ignoreDuplicates: true },
          )
          if (error) {
            // Zwróć 500 → Stripe ponowi webhook, zakup nie przepadnie.
            console.error('[webhook] upsert entitlement:', error.message)
            return new Response('DB error', { status: 500 })
          }
        } catch (e) {
          console.error('[webhook] service client:', e)
          return new Response('DB error', { status: 500 })
        }
      } else {
        console.warn('[webhook] checkout.session.completed bez user_id/agent_id w metadata')
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
