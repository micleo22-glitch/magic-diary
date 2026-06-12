// ─── House theme system ─────────────────────────────────────────────────────
// Concept: GOLD is the universal magic accent (legibility on dark surfaces),
// while each house gets a SIGNATURE color that drives:
//   • ambient "aurora" glows layered into dark backgrounds,
//   • CTA gradients (gold → house color),
//   • avatar rings, selection tints and glows.
// Hufflepuff = yellow + black → its surfaces stay near-black amber so the
// gold UI keeps AAA contrast.

export interface HouseTheme {
  primary:      string  // accent color — ALWAYS gold (#C9993F)
  primaryHover: string
  primaryDim:   string  // rgba highlight tint
  primaryGlow:  string  // box-shadow — house-tinted for avatar/button glow
  accent:       string  // house signature color (gold when no house picked)
  accentDim:    string  // soft house tint for selected states
  gradient:     string  // primary CTA gradient (gold → house color)
  sidebarBg:    string  // layered ambient gradient — changes per house
  navBg:        string  // solid nav surface (bottom bar, header fallback)
  navGlass:     string  // translucent surface for blurred glass bars
  selectionBg:  string  // selected entry row
  borderColor:  string  // dividers / card borders
  streakColor:  string  // streak badge background
}

// ─── Houses (single source of truth for pickers/avatars) ────────────────────
export interface HouseInfo {
  id: string
  name: string
  emoji: string
  color: string
  bg: string
  desc: string
}

export const HOUSES: HouseInfo[] = [
  { id: 'gryffindor', name: 'Gryffindor', emoji: '🦁', color: '#E0394F', bg: 'rgba(196,30,58,0.15)',  desc: 'Odwaga i szlachetność' },
  { id: 'slytherin',  name: 'Slytherin',  emoji: '🐍', color: '#3DC684', bg: 'rgba(46,173,110,0.12)', desc: 'Ambicja i przebiegłość' },
  { id: 'hufflepuff', name: 'Hufflepuff', emoji: '🦡', color: '#ECB939', bg: 'rgba(236,185,57,0.15)', desc: 'Cierpliwość i lojalność' },
  { id: 'ravenclaw',  name: 'Ravenclaw',  emoji: '🐦‍⬛', color: '#6B9BE3', bg: 'rgba(91,141,217,0.15)', desc: 'Mądrość i pomysłowość' },
]

// ─── Default (no house) ─────────────────────────────────────────────────────
export const DEFAULT_THEME: HouseTheme = {
  primary:      '#C9993F',
  primaryHover: '#D4A84A',
  primaryDim:   'rgba(201,153,63,0.15)',
  primaryGlow:  'rgba(201,153,63,0.30)',
  accent:       '#C9993F',
  accentDim:    'rgba(201,153,63,0.15)',
  gradient:     'linear-gradient(135deg, #F0C96A 0%, #C9993F 55%, #A87928 100%)',
  sidebarBg:
    'radial-gradient(ellipse 90% 55% at 12% -8%, rgba(201,153,63,0.16) 0%, transparent 60%), ' +
    'radial-gradient(ellipse 75% 50% at 105% 108%, rgba(139,90,43,0.20) 0%, transparent 65%), ' +
    'linear-gradient(180deg, #261009 0%, #170805 100%)',
  navBg:        '#230D08',
  navGlass:     'rgba(35,13,8,0.80)',
  selectionBg:  'rgba(201,153,63,0.15)',
  borderColor:  'rgba(201,169,110,0.20)',
  streakColor:  'rgba(201,153,63,0.15)',
}

// ─── Per-house palettes ──────────────────────────────────────────────────────
// Shared gold accent; the house color drives aurora, gradient, glow, selection.

const HOUSE_THEMES: Record<string, HouseTheme> = {

  // 🦁 GRYFFINDOR — scarlet aurora, gold accent
  gryffindor: {
    ...DEFAULT_THEME,
    primaryGlow:  'rgba(224,57,79,0.35)',
    accent:       '#E0394F',
    accentDim:    'rgba(224,57,79,0.14)',
    gradient:     'linear-gradient(135deg, #F0C96A 0%, #D8693F 45%, #C41E3A 100%)',
    sidebarBg:
      'radial-gradient(ellipse 90% 55% at 12% -8%, rgba(196,30,58,0.30) 0%, transparent 60%), ' +
      'radial-gradient(ellipse 75% 50% at 105% 108%, rgba(240,201,106,0.10) 0%, transparent 65%), ' +
      'linear-gradient(180deg, #220A0E 0%, #130507 100%)',
    navBg:        '#220A0D',
    navGlass:     'rgba(34,10,13,0.80)',
    selectionBg:  'rgba(224,57,79,0.14)',
  },

  // 🐍 SLYTHERIN — emerald aurora, gold accent
  slytherin: {
    ...DEFAULT_THEME,
    primaryGlow:  'rgba(46,173,110,0.32)',
    accent:       '#3DC684',
    accentDim:    'rgba(61,198,132,0.12)',
    gradient:     'linear-gradient(135deg, #F0C96A 0%, #7DB85A 45%, #2EAD6E 100%)',
    sidebarBg:
      'radial-gradient(ellipse 90% 55% at 12% -8%, rgba(46,173,110,0.22) 0%, transparent 60%), ' +
      'radial-gradient(ellipse 75% 50% at 105% 108%, rgba(240,201,106,0.08) 0%, transparent 65%), ' +
      'linear-gradient(180deg, #08170F 0%, #040D08 100%)',
    navBg:        '#08160E',
    navGlass:     'rgba(8,22,14,0.80)',
    selectionBg:  'rgba(61,198,132,0.13)',
  },

  // 🦡 HUFFLEPUFF — warm amber aurora over near-black, gold accent
  // Primary #C9993F on navBg #2A1C00 → contrast 6.58:1 ✓✓ AAA
  hufflepuff: {
    ...DEFAULT_THEME,
    primaryGlow:  'rgba(236,185,57,0.45)',
    accent:       '#ECB939',
    accentDim:    'rgba(236,185,57,0.14)',
    gradient:     'linear-gradient(135deg, #F8DC8C 0%, #ECB939 55%, #C9993F 100%)',
    sidebarBg:
      'radial-gradient(ellipse 90% 55% at 12% -8%, rgba(236,185,57,0.20) 0%, transparent 60%), ' +
      'radial-gradient(ellipse 75% 50% at 105% 108%, rgba(139,90,43,0.22) 0%, transparent 65%), ' +
      'linear-gradient(180deg, #241800 0%, #140D00 100%)',
    navBg:        '#221600',
    navGlass:     'rgba(34,22,0,0.80)',
    selectionBg:  'rgba(236,185,57,0.14)',
  },

  // 🐦‍⬛ RAVENCLAW — midnight-blue aurora with bronze hint, gold accent
  ravenclaw: {
    ...DEFAULT_THEME,
    primaryGlow:  'rgba(107,155,227,0.32)',
    accent:       '#6B9BE3',
    accentDim:    'rgba(107,155,227,0.13)',
    gradient:     'linear-gradient(135deg, #F0C96A 0%, #8FA0B8 45%, #5B8DD9 100%)',
    sidebarBg:
      'radial-gradient(ellipse 90% 55% at 12% -8%, rgba(91,141,217,0.24) 0%, transparent 60%), ' +
      'radial-gradient(ellipse 75% 50% at 105% 108%, rgba(201,153,63,0.10) 0%, transparent 65%), ' +
      'linear-gradient(180deg, #0A1322 0%, #050A13 100%)',
    navBg:        '#0A1220',
    navGlass:     'rgba(10,18,32,0.80)',
    selectionBg:  'rgba(107,155,227,0.13)',
  },
}

export function getHouseTheme(house: string): HouseTheme {
  return HOUSE_THEMES[house] ?? DEFAULT_THEME
}

/** "7 dni" / "1 dzień" */
export function streakLabel(n: number): string {
  if (n === 1) return '1 dzień'
  return `${n} dni`
}
