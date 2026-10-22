import { formatNumber } from '../lib/format.js'
import { pageLabel } from '../lib/labels.js'
import { BreakdownCard } from './BreakdownCard.jsx'

export function TopPages({ data }) {
  const rows = data
    ? data.items.map((item) => ({
        key: item.value ?? 'unknown',
        ...pageLabel(item.value),
        value: item.pageviews,
        secondary: item.visitors,
      }))
    : null

  const footnote = data?.other?.pageviews
    ? `Plus ${formatNumber(data.other.pageviews)} views across other pages.`
    : null

  return (
    <BreakdownCard
      id="top-pages"
      title="Top Pages"
      subtitle="The pages people viewed most"
      rows={rows}
      columns={{ label: 'Page', value: 'Views', secondary: 'Visitors' }}
      emptyMessage="No page views were recorded for this period."
      footnote={footnote}
    />
  )
}
