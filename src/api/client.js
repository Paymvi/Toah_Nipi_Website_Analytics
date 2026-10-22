// Browser-side API client. The browser only ever talks to this app's own /api
// functions; it never contacts Vercel directly and never sees any credentials.

export class ApiError extends Error {
  constructor(code, message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(path, {
      credentials: 'same-origin',
      ...options,
      headers: { Accept: 'application/json', ...options.headers },
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('network', 'Network request failed')
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await response.json().catch(() => null) : null

  if (!isJson) {
    // Usually means the /api functions aren't running (e.g. `vite` instead of `vercel dev`).
    console.warn(`[api] ${path} did not return JSON (status ${response.status}). Are the API functions running?`)
    throw new ApiError('api_unavailable', 'The analytics service did not respond as expected', response.status)
  }
  if (!response.ok) {
    throw new ApiError(body?.error?.code ?? 'unknown', body?.error?.message ?? 'Request failed', response.status)
  }
  return body
}

export function getSession() {
  return request('/api/auth/session')
}

export function signIn(password) {
  return request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
}

export function signOut() {
  return request('/api/auth/logout', { method: 'POST' })
}

export function getAnalytics(range, signal) {
  const params = new URLSearchParams({ range })
  return request(`/api/analytics?${params}`, { signal })
}
