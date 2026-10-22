import { queryVisits } from './vercel.js'

const DAY_MS = 24 * 60 * 60 * 1000

export const RANGES = {
  '7d': { days: 7, label: 'Last 7 days' },
  '30d': { days: 30, label: 'Last 30 days' },
}
export const DEFAULT_RANGE = '7d'

// How many rows to request for each breakdown. Anything beyond the limit is
// rolled up by Vercel into a single "Others" row.
const BREAKDOWNS = {
  pages: { by: 'requestPath', limit: 10, sortBy: 'pageviews' },
  referrers: { by: 'referrerHostname', limit: 8, sortBy: 'visitors' },
  countries: { by: 'country', limit: 8, sortBy: 'visitors' },
  devices: { by: 'deviceType', limit: 5, sortBy: 'visitors' },
  browsers: { by: 'browserName', limit: 6, sortBy: 'visitors' },
}

const OTHERS_VALUE = 'Others'

export function isValidRange(value) {
  return typeof value === 'string' && Object.hasOwn(RANGES, value)
}

const toDateKey = (date) => date.toISOString().slice(0, 10)

// Vercel buckets days in UTC, so periods are defined in whole UTC days ending
// today. The previous period has exactly the same length, shifted back.
export function resolveRange(key, now = new Date()) {
  const { days, label } = RANGES[key]
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

  const since = new Date(startOfToday - (days - 1) * DAY_MS)
  const until = new Date(now.getTime())
  const previousSince = new Date(since.getTime() - days * DAY_MS)
  const previousUntil = new Date(until.getTime() - days * DAY_MS)

  return {
    key,
    label,
    days,
    since,
    until,
    previousSince,
    previousUntil,
  }
}

function toCount(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0
}

export function pagesPerVisitor(pageviews, visitors) {
  if (!visitors) return null
  return Math.round((pageviews / visitors) * 100) / 100
}

// Percentage change, or null when it can't be expressed as a percentage
// (missing values, or growth from zero).
export function percentChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

export function summarize(rows) {
  let pageviews = 0
  let visitors = 0
  for (const row of rows) {
    pageviews += toCount(row.pageviews)
    visitors += toCount(row.visitors)
  }
  return { pageviews, visitors, pagesPerVisitor: pagesPerVisitor(pageviews, visitors) }
}

const exactRatio = ({ pageviews, visitors }) => (visitors ? pageviews / visitors : null)

export function buildComparison(current, previous) {
  const metric = (name, currentValue = current[name], previousValue = previous[name]) => ({
    previous: previous[name],
    percentChange: percentChange(currentValue, previousValue),
  })
  return {
    visitors: metric('visitors'),
    pageviews: metric('pageviews'),
    // Compare the unrounded ratios so rounding doesn't skew the percentage.
    pagesPerVisitor: metric('pagesPerVisitor', exactRatio(current), exactRatio(previous)),
  }
}

// One entry per UTC day in the range. Days without rows had no recorded visits.
export function buildTrend(rows, since, until) {
  const byDay = new Map()
  for (const row of rows) {
    const time = new Date(row.timestamp)
    if (Number.isNaN(time.getTime())) continue
    const key = toDateKey(time)
    const existing = byDay.get(key) ?? { pageviews: 0, visitors: 0 }
    existing.pageviews += toCount(row.pageviews)
    existing.visitors += toCount(row.visitors)
    byDay.set(key, existing)
  }

  const trend = []
  for (let time = since.getTime(); time <= until.getTime(); time += DAY_MS) {
    const date = toDateKey(new Date(time))
    const counts = byDay.get(date) ?? { pageviews: 0, visitors: 0 }
    trend.push({ date, ...counts })
  }
  return trend
}

export function normalizeBreakdown(rows, dimension, sortBy) {
  const items = []
  let other = null

  for (const row of rows) {
    const raw = row[dimension]
    const value = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null
    const counts = { pageviews: toCount(row.pageviews), visitors: toCount(row.visitors) }

    if (value === OTHERS_VALUE) {
      other = counts
    } else {
      items.push({ value, ...counts })
    }
  }

  items.sort((a, b) => b[sortBy] - a[sortBy] || b.pageviews - a.pageviews)

  const totals = items.reduce(
    (sum, item) => ({ pageviews: sum.pageviews + item.pageviews, visitors: sum.visitors + item.visitors }),
    other ? { ...other } : { pageviews: 0, visitors: 0 },
  )

  return { items, other, totals }
}

function logOptionalFailure(name, result) {
  if (result.status === 'rejected') {
    console.error(`[analytics] ${name} could not be loaded; showing the rest of the dashboard.`, result.reason?.message)
  }
}

export async function buildAnalytics(config, rangeKey, now = new Date()) {
  const range = resolveRange(rangeKey, now)
  const current = (by, limit) => queryVisits(config, { by, limit, since: range.since, until: range.until })

  // Everything is requested concurrently. The optional queries get their
  // settled handlers attached first so a core failure can't leave them unhandled.
  const breakdownNames = Object.keys(BREAKDOWNS)
  const optional = Promise.allSettled([
    queryVisits(config, { by: 'environment', since: range.previousSince, until: range.previousUntil }),
    ...breakdownNames.map((name) => current(BREAKDOWNS[name].by, BREAKDOWNS[name].limit)),
  ])

  // Period totals come from a single aggregate over the whole range (grouped by
  // environment, which is production only), so Vercel does the visitor counting.
  const [totalRows, trendRows] = await Promise.all([current('environment'), current('day')])
  const [previousResult, ...breakdownResults] = await optional

  const summary = summarize(totalRows)

  logOptionalFailure('Previous-period comparison', previousResult)
  summary.comparison =
    previousResult.status === 'fulfilled' ? buildComparison(summary, summarize(previousResult.value)) : null

  const breakdowns = {}
  breakdownNames.forEach((name, index) => {
    const result = breakdownResults[index]
    logOptionalFailure(`Breakdown "${name}"`, result)
    const { by, sortBy } = BREAKDOWNS[name]
    // null tells the frontend this section failed to load (as opposed to being empty).
    breakdowns[name] = result.status === 'fulfilled' ? normalizeBreakdown(result.value, by, sortBy) : null
  })

  return {
    range: {
      key: range.key,
      label: range.label,
      days: range.days,
      timezone: 'UTC',
      startDate: toDateKey(range.since),
      endDate: toDateKey(range.until),
      previous: {
        startDate: toDateKey(range.previousSince),
        endDate: toDateKey(range.previousUntil),
      },
    },
    summary,
    trend: buildTrend(trendRows, range.since, range.until),
    ...breakdowns,
    updatedAt: now.toISOString(),
  }
}
