import { getAuthConfig } from '../_lib/config.js'
import { errorResponse, handleUnexpected, json } from '../_lib/http.js'
import { createSessionToken, passwordMatches, sessionCookie } from '../_lib/session.js'

const MAX_PASSWORD_LENGTH = 256
// A short pause after a wrong password slows down guessing without needing storage.
const FAILED_ATTEMPT_DELAY_MS = 750

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function POST(request) {
  try {
    const config = getAuthConfig()

    // Requiring JSON also blocks cross-site HTML form submissions.
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return errorResponse(415, 'bad_request', 'Please sign in using the dashboard.')
    }

    const body = await request.json().catch(() => null)
    const password = body?.password
    if (typeof password !== 'string' || password.length === 0 || password.length > MAX_PASSWORD_LENGTH) {
      return errorResponse(400, 'bad_request', 'Please enter the dashboard password.')
    }

    if (!passwordMatches(password, config.password)) {
      await delay(FAILED_ATTEMPT_DELAY_MS)
      return errorResponse(401, 'invalid_password', "That password isn't right. Please try again.")
    }

    const { token, expiresAt } = createSessionToken(config)
    return json(
      { authenticated: true, expiresAt: new Date(expiresAt).toISOString() },
      200,
      { 'set-cookie': sessionCookie(token) },
    )
  } catch (error) {
    return handleUnexpected(error, 'auth/login')
  }
}
