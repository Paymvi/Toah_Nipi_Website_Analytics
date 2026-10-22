import { handleUnexpected, json } from '../_lib/http.js'
import { getSession } from '../_lib/session.js'

export function GET(request) {
  try {
    const session = getSession(request)
    if (!session) return json({ authenticated: false })
    return json({ authenticated: true, expiresAt: new Date(session.exp * 1000).toISOString() })
  } catch (error) {
    return handleUnexpected(error, 'auth/session')
  }
}
