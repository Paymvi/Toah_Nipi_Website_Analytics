import { ExternalLink, LogOut, RefreshCw } from 'lucide-react'
import { formatDateSpan, formatUpdatedAt } from '../lib/format.js'
import { Brand } from './Brand.jsx'
import { RangeSelector } from './RangeSelector.jsx'

export function DashboardHeader({ range, onRangeChange, onRefresh, onSignOut, loading, data }) {
  return (
    <header className="dashboard-header">
      <div className="page-width header-main">
        <div className="header-identity">
          <Brand />
          <a className="site-link" href="https://toahnipi.org" target="_blank" rel="noreferrer">
            toahnipi.org
            <ExternalLink size={13} aria-hidden="true" />
            <span className="visually-hidden">(opens in a new tab)</span>
          </a>
        </div>

        <div className="header-controls">
          <RangeSelector value={range} onChange={onRangeChange} />
          <button type="button" className="button button--secondary" onClick={onRefresh}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} aria-hidden="true" />
            Refresh
          </button>
          <button type="button" className="button button--quiet" onClick={onSignOut}>
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>

      <div className="page-width header-meta">
        <p className="header-period">
          {data
            ? <>Showing <strong>{formatDateSpan(data.range.startDate, data.range.endDate)}</strong></>
            : loading ? 'Loading the latest figures…' : null}
        </p>
        <p className="header-updated" role="status" aria-live="polite">
          {loading && data ? 'Updating…' : data ? `Last updated ${formatUpdatedAt(data.updatedAt)}` : ''}
        </p>
      </div>
    </header>
  )
}
