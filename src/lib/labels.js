// Friendly display labels for raw analytics values. These only change how a
// value is shown; they never change the numbers.

function titleCase(text) {
  return text.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())
}

function safeDecode(text) {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

function segmentLabel(segment) {
  return titleCase(
    safeDecode(segment)
      .replace(/\.html?$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim(),
  )
}

// "/" → Home, "/our-story" → Our Story, "/events/summer-camp" → Events › Summer Camp
export function pageLabel(path) {
  if (!path) return { label: 'Unknown page', detail: null }
  if (path === '/') return { label: 'Home', detail: '/' }

  const label = path.split('/').filter(Boolean).map(segmentLabel).filter(Boolean).join(' › ')
  return { label: label || path, detail: path }
}

// A handful of well-known sources. Anything else shows its hostname.
const KNOWN_REFERRERS = [
  [/(^|\.)google\.[a-z.]+$/, 'Google'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
  [/(^|\.)yahoo\.com$/, 'Yahoo'],
  [/(^|\.)(facebook\.com|fb\.com)$/, 'Facebook'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'LinkedIn'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, 'X (Twitter)'],
  [/(^|\.)chatgpt\.com$/, 'ChatGPT'],
]

export function referrerLabel(hostname) {
  if (!hostname) return { label: 'Direct or unknown', detail: 'Typed in, bookmarked, or not shared' }
  const host = hostname.toLowerCase()
  const match = KNOWN_REFERRERS.find(([pattern]) => pattern.test(host))
  if (match) return { label: match[1], detail: host }
  return { label: host.replace(/^www\./, ''), detail: null }
}

let regionNames = null
try {
  regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
} catch {
  // Older browsers: fall back to the raw country code.
}

export function countryLabel(code) {
  if (!code || code.length !== 2) return 'Unknown'
  const upper = code.toUpperCase()
  try {
    return regionNames?.of(upper) ?? upper
  } catch {
    return upper
  }
}

export function deviceLabel(type) {
  return type ? titleCase(type.toLowerCase()) : 'Unknown'
}

export function browserLabel(name) {
  return name || 'Unknown'
}
