/** Returns true if the string is a valid calendar date in YYYY-MM-DD format. */
export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(s)
  return !isNaN(d.getTime()) && d.toISOString().startsWith(s)
}
