// Shared date formatting — human-friendly labels for diary entries.

const PL_MONTHS_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
  'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']

const PL_MONTHS_LONG = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']

const PL_DAYS = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']

function midnight(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** "11 cze 2026" */
export function shortDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${PL_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

/** "Środa, 11 czerwca 2026" */
export function fullDate(iso: string): string {
  const d = new Date(iso)
  return `${PL_DAYS[d.getDay()]}, ${d.getDate()} ${PL_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Friendly relative label for recent entries, full date for older ones.
 * "Dziś" / "Wczoraj" / "X dni temu" (2–6 days), otherwise shortDate.
 */
export function relativeDate(iso: string): string {
  const diff = Math.round((midnight(new Date()).getTime() - midnight(new Date(iso)).getTime()) / 86400000)
  if (diff === 0) return 'Dziś'
  if (diff === 1) return 'Wczoraj'
  if (diff >= 2 && diff <= 6) return `${diff} dni temu`
  return shortDate(iso)
}
