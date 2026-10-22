// Thin client for Vercel's Web Analytics API. This is the only module that
// talks to api.vercel.com, and it only ever runs on the server.

const AGGREGATE_URL = 'https://api.vercel.com/v1/query/web-analytics/visits/aggregate'
const REQUEST_TIMEOUT_MS = 15_000

// Vercel defaults to production traffic; we say so explicitly so the dashboard
// keeps meaning "the public website" even if that default ever changes.
export const PRODUCTION_FILTER = "environment eq 'production'"

export class VercelApiError extends Error {
  // kind: 'auth' | 'not_found' | 'plan' | 'rate_limited' | 'bad_request' | 'upstream' | 'unreachable'
  constructor(kind, message, { status = null, by = null } = {}) {
    super(message)
    this.name = 'VercelApiError'
    this.kind = kind
    this.status = status
    this.by = by
  }
}

function kindForStatus(status) {
  if (status === 401 || status === 403) return 'auth'
  if (status === 404) return 'not_found'
  if (status === 402) return 'plan'
  if (status === 429) return 'rate_limited'
  if (status === 400) return 'bad_request'
  return 'upstream'
}

// Returns the `data` rows of a visits/aggregate query.
export async function queryVisits(config, { by, since, until, limit, filter = PRODUCTION_FILTER }) {
  const url = new URL(AGGREGATE_URL)
  const params = url.searchParams
  params.set('projectId', config.projectId)
  if (config.teamId) params.set('teamId', config.teamId)
  params.set('by', by)
  params.set('since', since.toISOString())
  params.set('until', until.toISOString())
  if (limit) params.set('limit', String(limit))
  if (filter) params.set('filter', filter)

  let response
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (cause) {
    // Network failure or timeout. Never log the URL with headers attached.
    console.error(`[vercel] Request for by=${by} failed before a response:`, cause?.name, cause?.message)
    throw new VercelApiError('unreachable', 'Could not reach the Vercel API', { by })
  }

  if (!response.ok) {
    // Vercel error bodies are short JSON ({ error: { code, message } }) and contain no secrets.
    const detail = (await response.text().catch(() => '')).slice(0, 500)
    console.error(`[vercel] by=${by} responded ${response.status}: ${detail}`)
    throw new VercelApiError(kindForStatus(response.status), `Vercel API responded ${response.status}`, {
      status: response.status,
      by,
    })
  }

  const payload = await response.json().catch(() => null)
  if (!payload || !Array.isArray(payload.data)) {
    console.error(`[vercel] by=${by} returned an unexpected payload shape`)
    throw new VercelApiError('upstream', 'Unexpected response from the Vercel API', { by })
  }
  return payload.data
}
