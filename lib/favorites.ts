const KEY = 'magic_diary_favorites'

export function getFavoriteIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

export function toggleFavorite(id: string): boolean {
  const favs = getFavoriteIds()
  if (favs.has(id)) {
    favs.delete(id)
  } else {
    favs.add(id)
  }
  localStorage.setItem(KEY, JSON.stringify(Array.from(favs)))
  return favs.has(id)
}
