import { formatNumber } from '../lib/format.js'
import { browserLabel } from '../lib/labels.js'
import { BreakdownCard } from './BreakdownCard.jsx'

export function BrowserBreakdown({ data }) {
  const rows = data
    ? data.items.map((item) => ({
        key: item.value ?? 'unknown',
        label: browserLabel(item.value),
        value: item.visitors,
      }))
    : null

  const footnote = data?.other?.visitors
    ? `Plus ${formatNumber(data.other.visitors)} visitors using other browsers.`
    : null

  return (
    <BreakdownCard
      id="browsers"
      title="Browsers"
      subtitle="Share of visitors by web browser"
      rows={rows}
      columns={{ label: 'Browser', value: 'Visitors' }}
      shareOf={data?.totals.visitors}
      emptyMessage="No browser information was recorded for this period."
      footnote={footnote}
    />
  )
}
