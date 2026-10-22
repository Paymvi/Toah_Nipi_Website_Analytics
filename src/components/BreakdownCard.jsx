import { AlertCircle } from 'lucide-react'
import { formatNumber, formatShare } from '../lib/format.js'
import { EmptyState } from './EmptyState.jsx'

// Shared layout for the ranked lists (pages, sources, devices, countries, browsers).
//
// rows:      [{ key, label, detail?, icon?, value, secondary? }]
// columns:   header labels, e.g. { label: 'Page', value: 'Views', secondary: 'Visitors' }
// shareOf:   when set, each value is also shown as a share of this total
// footnote:  optional note under the list (e.g. traffic grouped into "other")
export function BreakdownCard({
  id,
  title,
  subtitle,
  rows,
  columns,
  shareOf,
  emptyMessage,
  footnote,
  className = '',
}) {
  const headingId = `${id}-heading`
  const max = rows?.length ? Math.max(...rows.map((row) => row.value)) : 0

  let content
  if (rows === null) {
    content = (
      <p className="breakdown-error">
        <AlertCircle size={16} aria-hidden="true" />
        This section couldn&apos;t be loaded. Try refreshing.
      </p>
    )
  } else if (rows.length === 0) {
    content = <EmptyState message={emptyMessage} />
  } else {
    content = (
      <>
        <div className="breakdown-columns" aria-hidden="true">
          <span>{columns.label}</span>
          <span>{columns.value}</span>
          {columns.secondary && <span className="breakdown-secondary">{columns.secondary}</span>}
        </div>
        <ol className={`breakdown-list ${columns.secondary ? 'has-secondary' : ''}`}>
          {rows.map((row) => (
            <li key={row.key} className="breakdown-row">
              <div className="breakdown-text">
                <span className="breakdown-label">
                  {row.icon}
                  <span>{row.label}</span>
                </span>
                {row.detail && <span className="breakdown-detail">{row.detail}</span>}
              </div>
              <span className="breakdown-value">
                <span className="visually-hidden">{columns.value}: </span>
                {formatNumber(row.value)}
                {shareOf > 0 && <span className="breakdown-share">{formatShare(row.value, shareOf)}</span>}
              </span>
              {columns.secondary && (
                <span className="breakdown-value breakdown-secondary">
                  <span className="visually-hidden">{columns.secondary}: </span>
                  {formatNumber(row.secondary)}
                </span>
              )}
              <span className="breakdown-bar" aria-hidden="true">
                <span style={{ width: max ? `${Math.max((row.value / max) * 100, 2)}%` : 0 }} />
              </span>
            </li>
          ))}
        </ol>
        {footnote && <p className="breakdown-footnote">{footnote}</p>}
      </>
    )
  }

  return (
    <section className={`card breakdown-card ${className}`} aria-labelledby={headingId}>
      <header className="card-header">
        <div>
          <h2 id={headingId} className="card-title">{title}</h2>
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      </header>
      {content}
    </section>
  )
}
