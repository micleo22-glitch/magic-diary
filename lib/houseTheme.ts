// ─── House theme system ─────────────────────────────────────────────────────
// Concept: GOLD stays everywhere as the magic accent.
// Only BACKGROUNDS change per house.
// Hufflepuff = yellow + black → their background is deep black (not yellow,
// which would clash with the existing gold UI).
//
// Avatar glow subtly picks up house color for visual flair.

export interface HouseTheme {
  primary:      string  // accent color — ALWAYS gold (#C9993F)
  primaryHover: string
  primaryDim:   string  // rgba highlight tint
  primaryGlow:  string  // box-shadow — house-tinted for avatar/button glow
  sidebarBg:    string  // sidebar gradient — changes per house
  navBg:        string  // solid nav bg (bottom bar, overlays, header)
  selectionBg:  string  // selected entry row
  borderColor:  string  // dividers / card borders
  streakColor:  string  // streak badge background
}

// ─── Default (no house) ─────────────────────────────────────────────────────
export const DEFAULT_THEME: HouseTheme = {
  primary:      '#C9993F',
  primaryHover: '#D4A84A',
  primaryDim:   'rgba(201,153,63,0.15)',
  primaryGlow:  'rgba(201,153,63,0.30)',
  sidebarBg:    'linear-gradient(180deg, #2C0F0A 0%, #220B08 100%)',
  navBg:        '#2C0F0A',
  selectionBg:  'rgba(201,153,63,0.15)',
  borderColor:  'rgba(201,169,110,0.20)',
  streakColor:  'rgba(201,153,63,0.15)',
}

// ─── Per-house palettes ──────────────────────────────────────────────────────
// All share the same gold accent. Only backgrounds + glow differ.

const HOUSE_THEMES: Record<string, HouseTheme> = {

  // 🦁 GRYFFINDOR — scarlet background, gold accent
  gryffindor: {
    ...DEFAULT_THEME,
    primaryGlow:  'rgba(196,30,58,0.35)',
    sidebarBg:    'linear-gradient(180deg, #2A0A0D 0%, #1A0608 100%)',
    navBg:        '#2A0A0D',
  },

  // 🐍 SLYTHERIN — deep forest green background, gold accent
  slytherin: {
    ...DEFAULT_THEME,
    primaryGlow:  'rgba(46,173,110,0.30)',
    sidebarBg:    'linear-gradient(180deg, #071A10 0%, #040E0A 100%)',
    navBg:        '#071A10',
  },

  // 🦡 HUFFLEPUFF — very dark amber-gold background, gold accent
  // Primary #C9993F on navBg #2A1C00 → contrast 6.58:1 ✓✓ AAA
  hufflepuff: {
    ...DEFAULT_THEME,
    primaryGlow:  'rgba(201,153,63,0.45)',
    sidebarBg:    'linear-gradient(180deg, #2A1C00 0%, #1A1100 100%)',
    navBg:        '#2A1C00',
  },

  // 🦅 RAVENCLAW — midnight navy background, gold accent
  ravenclaw: {
    ...DEFAULT_THEME,
    primaryGlow:  'rgba(91,141,217,0.30)',
    sidebarBg:    'linear-gradient(180deg, #07111E 0%, #040B14 100%)',
    navBg:        '#07111E',
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
