const integer = new Intl.NumberFormat('en-US')
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

export function formatNumber(value) {
  return Number.isFinite(value) ? integer.format(value) : '—'
}

export function formatCompact(value) {
  return Number.isFinite(value) ? compact.format(value) : ''
}

export function formatRatio(value) {
  return Number.isFinite(value) ? value.toFixed(1) : '—'
}

export function formatShare(part, whole) {
  if (!whole) return '0%'
  const percent = (part / whole) * 100
  if (percent > 0 && percent < 1) return '<1%'
  return `${Math.round(percent)}%`
}

// Analytics days are UTC dates ("2026-10-15"); format them in UTC so a viewer's
// timezone never shifts a day.
function utcDate(dateKey) {
  return new Date(`${dateKey}T00:00:00Z`)
}

const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const longDate = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
})
const yearDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export const formatShortDate = (dateKey) => shortDate.format(utcDate(dateKey))
export const formatLongDate = (dateKey) => longDate.format(utcDate(dateKey))

export function formatDateSpan(startDate, endDate) {
  const start = utcDate(startDate)
  const end = utcDate(endDate)
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
  return `${sameYear ? shortDate.format(start) : yearDate.format(start)} – ${yearDate.format(end)}`
}

const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })

export function formatUpdatedAt(iso) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : time.format(date)
}

// Describes a previous-period comparison for a KPI card, or returns null when
// there's nothing meaningful to show.
export function describeChange(metric, periodLabel) {
  if (!metric) return null
  const suffix = `vs previous ${periodLabel}`
  const { percentChange, previous } = metric

  if (percentChange === null) {
    return previous === 0 ? { direction: 'neutral', text: `No activity in the previous ${periodLabel}` } : null
  }

  const rounded = Math.round(percentChange)
  if (rounded === 0) return { direction: 'neutral', text: `No change ${suffix}` }

  const direction = rounded > 0 ? 'up' : 'down'
  return {
    direction,
    symbol: direction === 'up' ? '↑' : '↓',
    text: `${Math.abs(rounded)}% ${suffix}`,
  }
}
