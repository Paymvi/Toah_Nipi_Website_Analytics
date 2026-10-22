import { ConfigError } from './config.js'

const BASE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  // Analytics and session state are private and should never be cached.
  'cache-control': 'private, no-store',
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...BASE_HEADERS, ...extraHeaders },
  })
}

// All errors sent to the browser share one shape: { error: { code, message } }.
// Messages are deliberately plain-language and never contain technical details.
export function errorResponse(status, code, message, extraHeaders = {}) {
  return json({ error: { code, message } }, status, extraHeaders)
}

export function configErrorResponse(error, context) {
  // Variable names are safe to log; their values are never logged.
  console.error(`[${context}] ${error.message}`)
  return errorResponse(
    500,
    'config',
    'The analytics dashboard is not fully set up yet. Please contact your website administrator.',
  )
}

export function handleUnexpected(error, context) {
  if (error instanceof ConfigError) return configErrorResponse(error, context)
  console.error(`[${context}] Unexpected error:`, error)
  return errorResponse(500, 'server_error', 'Something went wrong on our side. Please try again.')
}

export function readCookie(request, name) {
  const header = request.headers.get('cookie')
  if (!header) return null

  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    if (part.slice(0, index).trim() === name) {
      return part.slice(index + 1).trim() || null
    }
  }
  return null
}
