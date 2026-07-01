// Katalog PŁATNYCH nauczycieli — źródło prawdy dla mapowania agent_id → Stripe.
//
//   • CENA / PRODUKT            → Stripe Dashboard (Products + Prices).
//                                 Zmiana ceny = edycja w Stripe, bez redeploy.
//   • stripePriceId             → tu, jako referencja do ceny w Stripe.
//   • OSOBOWOŚĆ / PROMPT        → app/api/chat/route.ts (mapa POSTACIE).
//   • METADANE WIZUALNE         → components/PostacieOverlay.tsx (CHARACTERS).
//   • KTO CO KUPIŁ              → Strapi `entitlements` (Supabase jest cachem/RLS mirror).

export interface PaidAgentMeta {
  /** Stripe Price ID (price_XXXX) — używany w Checkout Session. */
  stripePriceId: string
  /** Etykieta ceny na przycisku KUP w UI (synchronizuj z ceną w Stripe). */
  label: string
}

export const AGENT_PRICE: Record<string, PaidAgentMeta> = {
  dumbledore: { stripePriceId: 'price_1TjReKFaJoEHNa2WPk8h1gyZ', label: '5 zł' },
  hagrid:     { stripePriceId: 'price_1TjReLFaJoEHNa2WQbehz4u5', label: '5 zł' },
  mcgonagall: { stripePriceId: 'price_1TjReMFaJoEHNa2WQQ6NuGmM', label: '5 zł' },
  lockhart:   { stripePriceId: 'price_1TjReNFaJoEHNa2Wh7f3nNTM', label: '5 zł' },
}

/** Lista id płatnych agentów (do iteracji / walidacji). */
export const PAID_AGENT_IDS = Object.keys(AGENT_PRICE)

/** Czy dany nauczyciel jest płatny (a więc wymaga entitlementu, by go używać)? */
export function isPaidAgent(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(AGENT_PRICE, id)
}

/** Etykieta ceny dla UI, albo null gdy agent darmowy / nieznany. */
export function agentPriceLabel(id: string): string | null {
  return AGENT_PRICE[id]?.label ?? null
}
