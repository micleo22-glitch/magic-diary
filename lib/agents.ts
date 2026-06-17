// Katalog PŁATNYCH nauczycieli — źródło prawdy dla cen.
//
// Podział odpowiedzialności (świadoma decyzja architektoniczna — patrz plan Tydzień 4):
//   • CENA (kwota, nazwa)   → tutaj, w kodzie. Checkout tworzy w Stripe pozycję „w locie"
//                             (inline price_data), więc NIE trzeba ręcznie zakładać produktów.
//   • OSOBOWOŚĆ / PROMPT    → app/api/chat/route.ts (mapa POSTACIE).
//   • METADANE WIZUALNE     → components/PostacieOverlay.tsx (CHARACTERS).
//   • KTO CO KUPIŁ          → Supabase, tabela `entitlements`.

export interface PaidAgentMeta {
  /** Kwota w najmniejszej jednostce (grosze): 5,00 zł = 500. */
  amount: number
  /** Waluta ISO (małe litery), np. 'pln'. */
  currency: string
  /** Nazwa pozycji pokazywana na stronie Stripe Checkout. */
  name: string
  /** Etykieta ceny na przycisku KUP w UI. */
  label: string
}

export const AGENT_PRICE: Record<string, PaidAgentMeta> = {
  dumbledore: { amount: 500, currency: 'pln', name: 'Albus Dumbledore — Dyrektor Hogwartu', label: '5 zł' },
  hagrid:     { amount: 500, currency: 'pln', name: 'Rubeus Hagrid — Leśnik Hogwartu', label: '5 zł' },
  mcgonagall: { amount: 500, currency: 'pln', name: 'Minerwa McGonagall — Profesor Transfiguracji', label: '5 zł' },
  lockhart:   { amount: 500, currency: 'pln', name: 'Gilderoy Lockhart — Profesor Obrony', label: '5 zł' },
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
