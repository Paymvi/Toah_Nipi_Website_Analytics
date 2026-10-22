import { describeChange } from '../lib/format.js'

export function MetricCard({ label, value, description, comparison, periodLabel }) {
  const change = describeChange(comparison, periodLabel)

  return (
    <article className="card metric-card">
      <h2 className="metric-label">{label}</h2>
      <p className="metric-value">{value}</p>
      <p className="metric-description">{description}</p>
      {change && (
        <p className={`metric-change metric-change--${change.direction}`}>
          {change.symbol && <span aria-hidden="true">{change.symbol} </span>}
          <span className="visually-hidden">
            {change.direction === 'up' ? 'Up ' : change.direction === 'down' ? 'Down ' : ''}
          </span>
          {change.text}
        </p>
      )}
    </article>
  )
}
