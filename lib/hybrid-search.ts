import type { SupabaseClient } from '@supabase/supabase-js'
import { generateEmbedding, entryToText } from './embeddings'

const MOOD_LABEL: Record<number, string> = {
  5: 'Świetnie', 4: 'Dobrze', 3: 'Neutralnie', 2: 'Źle', 1: 'Koszmarnie',
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export interface HybridEntry {
  data: string
  tytuł: string
  nastrój: string | null
  treść: string
}

/**
 * Strip characters that have structural meaning in PostgREST filter strings
 * (`,` separates OR clauses, `()` group them, `\` escapes). Leaving them raw
 * would let a crafted query alter the filter shape. RLS already confines results
 * to the caller's own rows, so this is defence-in-depth, not the only guard.
 */
function sanitizeFilterValue(s: string): string {
  return s.replace(/[(),\\"]/g, ' ').trim()
}

export async function hybridSearch(
  db: SupabaseClient,
  query: string,
  opts: { matchCount?: number } = {}
): Promise<HybridEntry[]> {
  const matchCount = opts.matchCount ?? 30
  const embedding = await generateEmbedding(entryToText(query, null))

  if (embedding) {
    const { data, error } = await db.rpc('hybrid_search_entries', {
      query_embedding: embedding,
      query_text: query,
      match_count: matchCount,
    })

    if (!error && data?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((r: any) => ({
        data: r.date,
        tytuł: r.title || '(bez tytułu)',
        nastrój: r.mood ? MOOD_LABEL[r.mood as number] ?? null : null,
        treść: stripHtml(r.content ?? '').slice(0, 400),
      }))
    }
  }

  // Fallback: keyword + last 7 days when embedding unavailable
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const safeQuery = sanitizeFilterValue(query)
  const [keywordRes, recentRes] = await Promise.all([
    db
      .from('entries')
      .select('date, title, mood, content')
      .or(`title.ilike.%${safeQuery}%,content.ilike.%${safeQuery}%`)
      .order('date', { ascending: false })
      .limit(matchCount),
    db
      .from('entries')
      .select('date, title, mood, content')
      .gte('date', weekAgo)
      .lte('date', today)
      .order('date', { ascending: false }),
  ])

  const seen = new Set<string>()
  const results: HybridEntry[] = []

  for (const r of [...(keywordRes.data ?? []), ...(recentRes.data ?? [])]) {
    if (seen.has(r.date)) continue
    seen.add(r.date)
    results.push({
      data: r.date,
      tytuł: r.title || '(bez tytułu)',
      nastrój: r.mood ? MOOD_LABEL[r.mood as number] ?? null : null,
      treść: stripHtml(r.content ?? '').slice(0, 400),
    })
  }

  return results
}
