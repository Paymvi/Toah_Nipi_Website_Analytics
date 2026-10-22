import { useState } from 'react'
import { signOut } from '../api/client.js'
import { useAnalytics } from '../hooks/useAnalytics.js'
import { formatNumber, formatRatio } from '../lib/format.js'
import { BrowserBreakdown } from './BrowserBreakdown.jsx'
import { CountryBreakdown } from './CountryBreakdown.jsx'
import { DashboardHeader } from './DashboardHeader.jsx'
import { DeviceBreakdown } from './DeviceBreakdown.jsx'
import { ErrorState, InlineNotice } from './ErrorState.jsx'
import { LoadingSkeleton } from './LoadingSkeleton.jsx'
import { MetricCard } from './MetricCard.jsx'
import { Referrers } from './Referrers.jsx'
import { TopPages } from './TopPages.jsx'
import { TrafficChart } from './TrafficChart.jsx'
import '../styles/dashboard.css'

function DashboardContent({ data, loading, error }) {
  const { summary } = data
  const comparison = summary.comparison
  const periodLabel = `${data.range.days} days`

  return (
    <div className={`dashboard-body ${loading ? 'is-updating' : ''}`} aria-busy={loading}>
      {error && <InlineNotice error={error} />}

      <div className="metric-grid">
        <MetricCard
          label="Visitors"
          value={formatNumber(summary.visitors)}
          description="People who visited the website"
          comparison={comparison?.visitors}
          periodLabel={periodLabel}
        />
        <MetricCard
          label="Page Views"
          value={formatNumber(summary.pageviews)}
          description="Total pages viewed"
          comparison={comparison?.pageviews}
          periodLabel={periodLabel}
        />
        <MetricCard
          label="Pages / Visitor"
          value={formatRatio(summary.pagesPerVisitor)}
          description="Average pages viewed per visitor"
          comparison={comparison?.pagesPerVisitor}
          periodLabel={periodLabel}
        />
      </div>

      <TrafficChart trend={data.trend} />

      <div className="breakdown-grid">
        <div className="breakdown-grid-wide"><TopPages data={data.pages} /></div>
        <div className="breakdown-grid-side"><Referrers data={data.referrers} /></div>
        <DeviceBreakdown data={data.devices} />
        <CountryBreakdown data={data.countries} />
        <BrowserBreakdown data={data.browsers} />
      </div>
    </div>
  )
}

export function Dashboard({ onSignedOut, onSessionExpired }) {
  const [range, setRange] = useState('7d')
  const { data, error, loading, refresh } = useAnalytics(range, onSessionExpired)

  async function handleSignOut() {
    try {
      await signOut()
    } catch {
      // The cookie expires on its own; returning to the sign-in screen is still right.
    }
    onSignedOut()
  }

  let body
  if (data) body = <DashboardContent data={data} loading={loading} error={error} />
  else if (error && !loading) body = <ErrorState error={error} onRetry={refresh} />
  else body = <LoadingSkeleton />

  return (
    <div className="dashboard">
      <DashboardHeader
        range={range}
        onRangeChange={setRange}
        onRefresh={refresh}
        onSignOut={handleSignOut}
        loading={loading}
        data={data}
      />
      <main className="page-width">{body}</main>
      <footer className="page-width dashboard-footer">
        <p>
          Figures cover visits to the public toahnipi.org website, reported by Vercel Web Analytics.
          Days are measured in UTC.
        </p>
      </footer>
    </div>
  )
}
