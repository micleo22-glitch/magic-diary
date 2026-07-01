import { NextRequest } from 'next/server'
import { createUserClient } from '@/lib/supabase-admin'
import { getStrapiEntitlements } from '@/lib/strapi'

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? null
  if (!token) return jsonError('Brak tokenu.', 401)

  const db = createUserClient(token)
  const { data: { user }, error } = await db.auth.getUser()
  if (error || !user) return jsonError('Nieprawidłowy lub wygasły token.', 401)

  try {
    const entitlements = await getStrapiEntitlements(user.id)
    return new Response(JSON.stringify({
      agentIds: entitlements.map((row) => row.agent_id),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[entitlements] Strapi error:', error)
    return jsonError('Nie udało się pobrać odblokowanych nauczycieli.', 502)
  }
}
