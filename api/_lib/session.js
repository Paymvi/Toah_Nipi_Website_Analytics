import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { getAuthConfig, isLocalDevelopment } from './config.js'
import { errorResponse, readCookie } from './http.js'

export const SESSION_COOKIE = 'tn_analytics_session'
export const SESSION_TTL_SECONDS = 12 * 60 * 60

// The signing key mixes in the dashboard password, so changing the password
// immediately invalidates every existing session.
function signingKey({ sessionSecret, password }) {
  return createHmac('sha256', sessionSecret).update(`session-v1:${password}`).digest()
}

function sign(body, config) {
  return createHmac('sha256', signingKey(config)).update(body).digest('base64url')
}

function safeEqual(a, b) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

// Hash both values first so the comparison is constant-time regardless of length.
export function passwordMatches(candidate, expected) {
  const a = createHash('sha256').update(String(candidate)).digest()
  const b = createHash('sha256').update(String(expected)).digest()
  return timingSafeEqual(a, b)
}

export function createSessionToken(config, now = Date.now()) {
  const issuedAt = Math.floor(now / 1000)
  const payload = {
    v: 1,
    iat: issuedAt,
    exp: issuedAt + SESSION_TTL_SECONDS,
    nonce: randomBytes(12).toString('base64url'),
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return { token: `${body}.${sign(body, config)}`, expiresAt: payload.exp * 1000 }
}

// Returns the session payload when the token is authentic and unexpired, else null.
export function verifySessionToken(token, config, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 1024) return null

  const [body, signature, extra] = token.split('.')
  if (!body || !signature || extra !== undefined) return null
  if (!safeEqual(signature, sign(body, config))) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (payload?.v !== 1 || !Number.isInteger(payload.exp)) return null
    if (payload.exp * 1000 <= now) return null
    return payload
  } catch {
    return null
  }
}

function cookieAttributes(maxAge) {
  const attributes = ['Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAge}`]
  if (!isLocalDevelopment()) attributes.push('Secure')
  return attributes.join('; ')
}

export function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; ${cookieAttributes(SESSION_TTL_SECONDS)}`
}

export function clearedSessionCookie() {
  return `${SESSION_COOKIE}=; ${cookieAttributes(0)}`
}

export function getSession(request, config = getAuthConfig()) {
  return verifySessionToken(readCookie(request, SESSION_COOKIE), config)
}

// Returns null when the request is authenticated, or a 401 Response to send back.
// Throws ConfigError if authentication is not configured.
export function requireSession(request) {
  if (getSession(request)) return null
  return errorResponse(
    401,
    'unauthorized',
    'Your session has ended. Please sign in again.',
    { 'set-cookie': clearedSessionCookie() },
  )
}
