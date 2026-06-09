export function entryToText(title: string | null, content: string | null): string {
  const parts: string[] = []
  if (title?.trim()) parts.push(title.trim())
  if (content) {
    const stripped = content
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
    if (stripped) parts.push(stripped)
  }
  return parts.join('\n\n')
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || !text.trim()) return null

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.trim() }),
  })

  if (!res.ok) {
    console.error('[embeddings] OpenAI error', res.status, await res.text())
    return null
  }

  const json = await res.json()
  return (json.data?.[0]?.embedding as number[]) ?? null
}
