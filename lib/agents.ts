// Katalog PŁATNYCH nauczycieli — źródło prawdy dla mapowania agent_id → Stripe.
//
//   • CENA / PRODUKT            → Stripe Dashboard (Products + Prices).
//                                 Zmiana ceny = edycja w Stripe, bez redeploy.
//   • stripePriceId             → tu, jako referencja do ceny w Stripe.
//   • OSOBOWOŚĆ / PROMPT        → app/api/chat/route.ts (mapa POSTACIE).
//   • METADANE WIZUALNE         → components/PostacieOverlay.tsx (CHARACTERS).
//   • KTO CO KUPIŁ              → Supabase, tabela `entitlements`.

export interface PaidAgentMeta {
  /** Stripe Price ID (price_XXXX) — używany w Checkout Session. */
  stripePriceId: string
  /** Etykieta ceny na przycisku KUP w UI (synchronizuj z ceną w Stripe). */
  label: string
}

export const AGENT_PRICE: Record<string, PaidAgentMeta> = {
  dumbledore: { stripePriceId: 'price_1TjOWJF7efvmDVicRfNcWXJD', label: '5 zł' },
  hagrid:     { stripePriceId: 'price_1TjOWaF7efvmDVicYuY1PM1n', label: '5 zł' },
  mcgonagall: { stripePriceId: 'price_1TjOWdF7efvmDVicLHmneiIs', label: '5 zł' },
  lockhart:   { stripePriceId: 'price_1TjOWfF7efvmDVicozRqxa9q', label: '5 zł' },
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
