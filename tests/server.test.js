// Tests for the Vercel Functions. Run with `npm test` (uses Node's built-in test runner).
import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { GET as analyticsGET } from '../api/analytics.js'
import { POST as loginPOST } from '../api/auth/login.js'
import { POST as logoutPOST } from '../api/auth/logout.js'
import { GET as sessionGET } from '../api/auth/session.js'
import {
  buildTrend,
  isValidRange,
  normalizeBreakdown,
  pagesPerVisitor,
  percentChange,
  resolveRange,
} from '../api/_lib/analytics.js'
import {
  createSessionToken,
  passwordMatches,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  verifySessionToken,
} from '../api/_lib/session.js'

const ENV = {
  VERCEL_ANALYTICS_TOKEN: 'test-token-not-real',
  VERCEL_ANALYTICS_PROJECT_ID: 'prj_test',
  VERCEL_ANALYTICS_TEAM_ID: 'team_test',
  ANALYTICS_DASHBOARD_PASSWORD: 'correct horse battery staple',
  ANALYTICS_SESSION_SECRET: 'x'.repeat(48),
}
const AUTH = { password: ENV.ANALYTICS_DASHBOARD_PASSWORD, sessionSecret: ENV.ANALYTICS_SESSION_SECRET }

const originalFetch = globalThis.fetch
const originalError = console.error

beforeEach(() => {
  Object.assign(process.env, ENV)
  delete process.env.VERCEL_ENV
  console.error = () => {} // keep expected server logs out of test output
})

afterEach(() => {
  for (const key of Object.keys(ENV)) delete process.env[key]
  globalThis.fetch = originalFetch
  console.error = originalError
})

function authedRequest(path) {
  const { token } = createSessionToken(AUTH)
  return new Request(`http://localhost${path}`, { headers: { cookie: `${SESSION_COOKIE}=${token}` } })
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

// Fake Vercel API: returns rows per `by`, and records every request.
function mockVercel(handler) {
  const calls = []
  globalThis.fetch = async (url, init) => {
    const parsed = new URL(url)
    calls.push({ url: parsed, init })
    return handler(parsed)
  }
  return calls
}

const SAMPLE_ROWS = {
  environment: [{ environment: 'production', pageviews: 400, visitors: 100 }],
  requestPath: [
    { requestPath: '/lodging', pageviews: 50, visitors: 30 },
    { requestPath: '/', pageviews: 200, visitors: 90 },
    { requestPath: 'Others', pageviews: 20, visitors: 10 },
  ],
  referrerHostname: [
    { referrerHostname: 'www.google.com', pageviews: 60, visitors: 40 },
    { referrerHostname: '', pageviews: 100, visitors: 50 },
  ],
  country: [{ country: 'US', pageviews: 380, visitors: 95 }],
  deviceType: [],
  browserName: [{ browserName: 'Chrome', pageviews: 300, visitors: 70 }],
}

describe('sessions', () => {
  it('accepts a valid token and rejects tampering', () => {
    const { token } = createSessionToken(AUTH)
    assert.ok(verifySessionToken(token, AUTH))
    const [body, sig] = token.split('.')
    assert.equal(verifySessionToken(`${body}x.${sig}`, AUTH), null)
    assert.equal(verifySessionToken(`${body}.${sig.slice(0, -2)}aa`, AUTH), null)
    assert.equal(verifySessionToken('garbage', AUTH), null)
    assert.equal(verifySessionToken(null, AUTH), null)
  })

  it('expires after the session lifetime', () => {
    const now = Date.now()
    const { token } = createSessionToken(AUTH, now)
    assert.ok(verifySessionToken(token, AUTH, now + (SESSION_TTL_SECONDS - 60) * 1000))
    assert.equal(verifySessionToken(token, AUTH, now + (SESSION_TTL_SECONDS + 1) * 1000), null)
  })

  it('is invalidated by changing the secret or the password', () => {
    const { token } = createSessionToken(AUTH)
    assert.equal(verifySessionToken(token, { ...AUTH, sessionSecret: 'y'.repeat(48) }), null)
    assert.equal(verifySessionToken(token, { ...AUTH, password: 'new password' }), null)
  })

  it('compares passwords exactly', () => {
    assert.equal(passwordMatches('abc', 'abc'), true)
    assert.equal(passwordMatches('abc ', 'abc'), false)
    assert.equal(passwordMatches('', 'abc'), false)
  })
})

describe('analytics helpers', () => {
  it('validates ranges', () => {
    assert.equal(isValidRange('7d'), true)
    assert.equal(isValidRange('30d'), true)
    for (const bad of ['', '14d', '7D', 'toString', '__proto__', null, undefined, 7]) {
      assert.equal(isValidRange(bad), false, `expected ${String(bad)} to be rejected`)
    }
  })

  it('builds equal-length current and previous periods', () => {
    const now = new Date('2026-10-21T15:30:00Z')
    const range = resolveRange('7d', now)
    assert.equal(range.since.toISOString(), '2026-10-15T00:00:00.000Z')
    assert.equal(range.until.toISOString(), '2026-10-21T15:30:00.000Z')
    assert.equal(range.previousSince.toISOString(), '2026-10-08T00:00:00.000Z')
    assert.equal(range.previousUntil.toISOString(), '2026-10-14T15:30:00.000Z')
    assert.equal(range.until - range.since, range.previousUntil - range.previousSince)
  })

  it('handles division by zero', () => {
    assert.equal(pagesPerVisitor(0, 0), null)
    assert.equal(pagesPerVisitor(10, 0), null)
    assert.equal(pagesPerVisitor(37, 10), 3.7)
    assert.equal(percentChange(0, 0), 0)
    assert.equal(percentChange(5, 0), null)
    assert.equal(percentChange(null, 4), null)
    assert.equal(percentChange(112, 100), 12)
    assert.equal(percentChange(92, 100), -8)
  })

  it('fills days with no rows as zero', () => {
    const range = resolveRange('7d', new Date('2026-10-21T10:00:00Z'))
    const trend = buildTrend(
      [{ timestamp: '2026-10-17T00:00:00.000Z', pageviews: 5, visitors: 3 }],
      range.since,
      range.until,
    )
    assert.equal(trend.length, 7)
    assert.equal(trend[0].date, '2026-10-15')
    assert.equal(trend.at(-1).date, '2026-10-21')
    assert.deepEqual(trend[2], { date: '2026-10-17', pageviews: 5, visitors: 3 })
    assert.deepEqual(trend[0], { date: '2026-10-15', pageviews: 0, visitors: 0 })
    assert.equal(buildTrend([], range.since, range.until).every((d) => d.pageviews === 0), true)
  })

  it('normalizes breakdowns, including Others, blanks and empty results', () => {
    const pages = normalizeBreakdown(SAMPLE_ROWS.requestPath, 'requestPath', 'pageviews')
    assert.deepEqual(pages.items.map((i) => i.value), ['/', '/lodging'])
    assert.deepEqual(pages.other, { pageviews: 20, visitors: 10 })
    assert.deepEqual(pages.totals, { pageviews: 270, visitors: 130 })

    const refs = normalizeBreakdown(SAMPLE_ROWS.referrerHostname, 'referrerHostname', 'visitors')
    assert.equal(refs.items[0].value, null) // direct/unknown

    assert.deepEqual(normalizeBreakdown([], 'deviceType', 'visitors'), {
      items: [],
      other: null,
      totals: { pageviews: 0, visitors: 0 },
    })
  })
})

describe('GET /api/analytics', () => {
  it('requires authentication', async () => {
    const calls = mockVercel(() => jsonResponse({ data: [] }))
    const response = await analyticsGET(new Request('http://localhost/api/analytics?range=7d'))
    assert.equal(response.status, 401)
    assert.equal((await response.json()).error.code, 'unauthorized')
    assert.equal(calls.length, 0, 'Vercel must not be called for unauthenticated requests')
  })

  it('rejects a forged session cookie', async () => {
    const forged = createSessionToken({ ...AUTH, sessionSecret: 'z'.repeat(48) }).token
    const request = new Request('http://localhost/api/analytics', {
      headers: { cookie: `${SESSION_COOKIE}=${forged}` },
    })
    assert.equal((await analyticsGET(request)).status, 401)
  })

  it('rejects invalid ranges', async () => {
    const calls = mockVercel(() => jsonResponse({ data: [] }))
    for (const range of ['14d', 'all', '', '7d;drop']) {
      const response = await analyticsGET(authedRequest(`/api/analytics?range=${encodeURIComponent(range)}`))
      assert.equal(response.status, 400, `range "${range}"`)
    }
    assert.equal(calls.length, 0)
  })

  it('returns normalized analytics without leaking secrets', async () => {
    const calls = mockVercel((url) => {
      const by = url.searchParams.get('by')
      if (by === 'day') {
        return jsonResponse({ data: [{ timestamp: new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z', pageviews: 40, visitors: 10 }] })
      }
      return jsonResponse({ data: SAMPLE_ROWS[by] ?? [] })
    })

    const response = await analyticsGET(authedRequest('/api/analytics'))
    assert.equal(response.status, 200)
    assert.match(response.headers.get('cache-control'), /no-store/)
    const text = await response.text()
    for (const secret of Object.values(ENV)) assert.equal(text.includes(secret), false)

    const body = JSON.parse(text)
    assert.equal(body.range.key, '7d') // default range
    assert.equal(body.trend.length, 7)
    assert.deepEqual(
      { visitors: body.summary.visitors, pageviews: body.summary.pageviews, ppv: body.summary.pagesPerVisitor },
      { visitors: 100, pageviews: 400, ppv: 4 },
    )
    assert.equal(body.summary.comparison.visitors.percentChange, 0)
    assert.equal(body.pages.items[0].value, '/')
    assert.deepEqual(body.devices.items, [])

    // 2 core + 1 previous-period + 5 breakdowns, all with the token and project.
    assert.equal(calls.length, 8)
    for (const call of calls) {
      assert.equal(call.init.headers.Authorization, `Bearer ${ENV.VERCEL_ANALYTICS_TOKEN}`)
      assert.equal(call.url.searchParams.get('projectId'), 'prj_test')
      assert.equal(call.url.searchParams.get('teamId'), 'team_test')
      assert.equal(call.url.searchParams.get('filter'), "environment eq 'production'")
    }
  })

  it('omits teamId when it is not configured', async () => {
    delete process.env.VERCEL_ANALYTICS_TEAM_ID
    const calls = mockVercel(() => jsonResponse({ data: [] }))
    assert.equal((await analyticsGET(authedRequest('/api/analytics?range=30d'))).status, 200)
    assert.equal(calls.every((c) => !c.url.searchParams.has('teamId')), true)
  })

  it('handles completely empty analytics without errors', async () => {
    mockVercel(() => jsonResponse({ data: [] }))
    const body = await (await analyticsGET(authedRequest('/api/analytics?range=30d'))).json()
    assert.equal(body.trend.length, 30)
    assert.equal(body.summary.pagesPerVisitor, null)
    assert.equal(body.summary.comparison.visitors.percentChange, 0)
    assert.deepEqual(body.referrers.items, [])
  })

  it('keeps the dashboard when only the comparison or a breakdown fails', async () => {
    const now = Date.now()
    mockVercel((url) => {
      const since = new Date(url.searchParams.get('since')).getTime()
      const isPrevious = now - since > 8 * 24 * 60 * 60 * 1000
      if (isPrevious) return jsonResponse({ error: { code: 'internal' } }, 500)
      if (url.searchParams.get('by') === 'country') return jsonResponse({ error: {} }, 500)
      return jsonResponse({ data: SAMPLE_ROWS[url.searchParams.get('by')] ?? [] })
    })
    const response = await analyticsGET(authedRequest('/api/analytics?range=7d'))
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.summary.comparison, null)
    assert.equal(body.countries, null)
    assert.ok(body.pages)
  })

  it('maps Vercel failures to friendly errors', async () => {
    const cases = [
      [401, 'vercel_auth'],
      [403, 'vercel_auth'],
      [404, 'vercel_setup'],
      [429, 'vercel_busy'],
      [500, 'vercel_error'],
    ]
    for (const [status, code] of cases) {
      mockVercel(() => jsonResponse({ error: { message: 'nope' } }, status))
      const response = await analyticsGET(authedRequest('/api/analytics'))
      const body = await response.json()
      assert.equal(body.error.code, code, `status ${status}`)
      assert.equal(JSON.stringify(body).includes('nope'), false, 'raw Vercel errors must not reach the browser')
    }
  })

  it('handles network failures reaching Vercel', async () => {
    globalThis.fetch = async () => {
      throw new TypeError('fetch failed')
    }
    const response = await analyticsGET(authedRequest('/api/analytics'))
    assert.equal(response.status, 504)
    assert.equal((await response.json()).error.code, 'vercel_unreachable')
  })

  it('reports missing Vercel configuration safely', async () => {
    delete process.env.VERCEL_ANALYTICS_TOKEN
    const response = await analyticsGET(authedRequest('/api/analytics'))
    assert.equal(response.status, 500)
    const body = await response.json()
    assert.equal(body.error.code, 'config')
    assert.equal(JSON.stringify(body).includes('VERCEL_ANALYTICS_TOKEN'), false)
  })
})

describe('auth endpoints', () => {
  const login = (body, headers = { 'content-type': 'application/json' }) =>
    loginPOST(new Request('http://localhost/api/auth/login', { method: 'POST', headers, body }))

  it('rejects a wrong password', async () => {
    const response = await login(JSON.stringify({ password: 'wrong' }))
    assert.equal(response.status, 401)
    assert.equal((await response.json()).error.code, 'invalid_password')
    assert.equal(response.headers.get('set-cookie'), null)
  })

  it('rejects malformed requests', async () => {
    assert.equal((await login('not json')).status, 400)
    assert.equal((await login(JSON.stringify({ password: 123 }))).status, 400)
    assert.equal((await login(JSON.stringify({ password: '' }))).status, 400)
    assert.equal((await login('password=x', { 'content-type': 'application/x-www-form-urlencoded' })).status, 415)
  })

  it('signs in with the right password and sets a hardened cookie', async () => {
    process.env.VERCEL_ENV = 'production'
    const response = await login(JSON.stringify({ password: ENV.ANALYTICS_DASHBOARD_PASSWORD }))
    assert.equal(response.status, 200)
    const text = await response.text()
    assert.equal(text.includes(ENV.ANALYTICS_DASHBOARD_PASSWORD), false)

    const cookie = response.headers.get('set-cookie')
    assert.match(cookie, new RegExp(`^${SESSION_COOKIE}=`))
    assert.match(cookie, /HttpOnly/)
    assert.match(cookie, /Secure/)
    assert.match(cookie, /SameSite=Strict/)
    assert.match(cookie, /Max-Age=43200/)

    const token = cookie.split(';')[0].split('=')[1]
    const session = await sessionGET(
      new Request('http://localhost/api/auth/session', { headers: { cookie: `${SESSION_COOKIE}=${token}` } }),
    )
    assert.equal((await session.json()).authenticated, true)
  })

  it('omits Secure only for local development', async () => {
    const response = await login(JSON.stringify({ password: ENV.ANALYTICS_DASHBOARD_PASSWORD }))
    assert.doesNotMatch(response.headers.get('set-cookie'), /Secure/)
  })

  it('reports signed-out sessions and clears the cookie on logout', async () => {
    const session = await sessionGET(new Request('http://localhost/api/auth/session'))
    assert.deepEqual(await session.json(), { authenticated: false })

    const logout = logoutPOST(new Request('http://localhost/api/auth/logout', { method: 'POST' }))
    assert.match(logout.headers.get('set-cookie'), /Max-Age=0/)
  })

  it('reports missing auth configuration', async () => {
    delete process.env.ANALYTICS_SESSION_SECRET
    const response = await sessionGET(new Request('http://localhost/api/auth/session'))
    assert.equal(response.status, 500)
    assert.equal((await response.json()).error.code, 'config')

    process.env.ANALYTICS_SESSION_SECRET = 'too-short'
    assert.equal((await login(JSON.stringify({ password: 'x' }))).status, 500)
  })
})
