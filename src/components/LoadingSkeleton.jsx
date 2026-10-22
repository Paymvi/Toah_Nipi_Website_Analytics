function Bar({ width = '100%', height = 12, className = '' }) {
  return <span className={`skeleton ${className}`} style={{ width, height }} />
}

function SkeletonCard({ rows = 5 }) {
  return (
    <div className="card breakdown-card">
      <Bar width="40%" height={16} />
      <div className="skeleton-rows">
        {Array.from({ length: rows }, (_, index) => (
          <Bar key={index} width={`${90 - index * 12}%`} height={14} />
        ))}
      </div>
    </div>
  )
}

// Mirrors the dashboard layout so the page doesn't shift when data arrives.
export function LoadingSkeleton() {
  return (
    <div className="dashboard-body" aria-busy="true" aria-label="Loading website analytics">
      <span className="visually-hidden" role="status">Loading website analytics…</span>
      <div className="metric-grid">
        {[0, 1, 2].map((key) => (
          <div key={key} className="card metric-card">
            <Bar width="45%" height={14} />
            <Bar width="60%" height={40} className="skeleton--number" />
            <Bar width="70%" height={12} />
          </div>
        ))}
      </div>
      <div className="card chart-card">
        <Bar width="30%" height={16} />
        <Bar height={260} className="skeleton--chart" />
      </div>
      <div className="breakdown-grid">
        <div className="breakdown-grid-wide"><SkeletonCard rows={8} /></div>
        <div className="breakdown-grid-side"><SkeletonCard rows={6} /></div>
        <SkeletonCard rows={3} />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}
