import { json } from '../_lib/http.js'
import { clearedSessionCookie } from '../_lib/session.js'

export function POST() {
  return json({ authenticated: false }, 200, { 'set-cookie': clearedSessionCookie() })
}
