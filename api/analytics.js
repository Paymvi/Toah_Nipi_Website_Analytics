import { buildAnalytics, DEFAULT_RANGE, isValidRange } from './_lib/analytics.js'
import { getVercelConfig } from './_lib/config.js'
import { errorResponse, handleUnexpected, json } from './_lib/http.js'
import { requireSession } from './_lib/session.js'
import { VercelApiError } from './_lib/vercel.js'

const GENERIC_MESSAGE = "We couldn't load the website analytics right now. Please try again."

// Maps Vercel failures to plain-language messages for the dashboard.
function vercelErrorResponse(error) {
  switch (error.kind) {
    case 'auth':
      return errorResponse(502, 'vercel_auth',
        'The connection to the analytics service needs attention. Please contact your website administrator.')
    case 'not_found':
    case 'plan':
    case 'bad_request':
      return errorResponse(502, 'vercel_setup',
        'The analytics service is not set up correctly for this website. Please contact your website administrator.')
    case 'rate_limited':
      return errorResponse(503, 'vercel_busy',
        'The analytics service is busy at the moment. Please wait a minute and try again.')
    case 'unreachable':
      return errorResponse(504, 'vercel_unreachable', GENERIC_MESSAGE)
    default:
      return errorResponse(502, 'vercel_error', GENERIC_MESSAGE)
  }
}

export async function GET(request) {
  try {
    const unauthorized = requireSession(request)
    if (unauthorized) return unauthorized

    const url = new URL(request.url)
    const range = url.searchParams.get('range') ?? DEFAULT_RANGE
    if (!isValidRange(range)) {
      return errorResponse(400, 'bad_request', 'Please choose a supported date range.')
    }

    const config = getVercelConfig()
    return json(await buildAnalytics(config, range))
  } catch (error) {
    if (error instanceof VercelApiError) return vercelErrorResponse(error)
    return handleUnexpected(error, 'analytics')
  }
}
