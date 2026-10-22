import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCompact, formatLongDate, formatNumber, formatShortDate } from '../lib/format.js'
import { EmptyState } from './EmptyState.jsx'

// Literal colors (matching the CSS tokens) because SVG attributes don't reliably
// resolve CSS variables in every browser.
const COLORS = {
  pageviews: '#1f7048',
  visitors: '#b8873a',
  grid: '#ebe4d5',
  axis: '#d3c8b2',
  tick: '#5c665f',
  surface: '#fffdf8',
}

const SERIES = [
  { key: 'pageviews', label: 'Page Views', color: COLORS.pageviews, fillOpacity: 0.14 },
  { key: 'visitors', label: 'Visitors', color: COLORS.visitors, fillOpacity: 0.1 },
]

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">{formatLongDate(label)}</p>
      {SERIES.map((series) => (
        <p key={series.key} className="chart-tooltip-row">
          <span className="swatch" style={{ background: series.color }} aria-hidden="true" />
          <span className="chart-tooltip-label">{series.label}</span>
          <span className="chart-tooltip-value">{formatNumber(point[series.key])}</span>
        </p>
      ))}
    </div>
  )
}

function Legend() {
  return (
    <ul className="chart-legend" aria-label="Chart legend">
      {SERIES.map((series) => (
        <li key={series.key}>
          <span className="swatch swatch--line" style={{ background: series.color }} aria-hidden="true" />
          {series.label}
        </li>
      ))}
    </ul>
  )
}

export function TrafficChart({ trend }) {
  const hasTraffic = trend.some((day) => day.pageviews > 0 || day.visitors > 0)

  return (
    <section className="card chart-card" aria-labelledby="traffic-heading">
      <header className="card-header">
        <div>
          <h2 id="traffic-heading" className="card-title">Traffic over time</h2>
          <p className="card-subtitle">Daily page views and visitors</p>
        </div>
        {hasTraffic && <Legend />}
      </header>

      {hasTraffic ? (
        <>
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <defs>
                  {SERIES.map((series) => (
                    <linearGradient key={series.key} id={`fill-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={series.color} stopOpacity={series.fillOpacity} />
                      <stop offset="100%" stopColor={series.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} stroke={COLORS.grid} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fill: COLORS.tick, fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: COLORS.axis }}
                  minTickGap={24}
                  tickMargin={8}
                />
                <YAxis
                  allowDecimals={false}
                  tickFormatter={formatCompact}
                  tick={{ fill: COLORS.tick, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: COLORS.axis, strokeWidth: 1 }}
                />
                {SERIES.map((series) => (
                  <Area
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={series.label}
                    stroke={series.color}
                    strokeWidth={2}
                    fill={`url(#fill-${series.key})`}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: COLORS.surface, fill: series.color }}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <details className="chart-table">
            <summary>Show daily numbers</summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Page Views</th>
                    <th scope="col">Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.map((day) => (
                    <tr key={day.date}>
                      <th scope="row">{formatLongDate(day.date)}</th>
                      <td>{formatNumber(day.pageviews)}</td>
                      <td>{formatNumber(day.visitors)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <EmptyState
          className="chart-empty"
          message="No visits have been recorded for this period yet."
        />
      )}
    </section>
  )
}
