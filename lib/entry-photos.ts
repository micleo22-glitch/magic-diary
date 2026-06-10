import { supabase } from './supabase'

const BUCKET = 'entry-photos'

export async function uploadEntryPhoto(
  userId: string,
  date: string,
  file: File,
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${userId}/${date}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function deleteEntryPhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.error('deleteEntryPhoto:', error)
}

export async function getSignedUrls(paths: string[]): Promise<string[]> {
  if (!paths.length) return []
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
  if (error || !data) return []
  return data.map(item => item.signedUrl).filter((url): url is string => Boolean(url))
}
