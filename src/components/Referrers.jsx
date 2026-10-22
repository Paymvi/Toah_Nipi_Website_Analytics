import { formatNumber } from '../lib/format.js'
import { referrerLabel } from '../lib/labels.js'
import { BreakdownCard } from './BreakdownCard.jsx'

export function Referrers({ data }) {
  const rows = data
    ? data.items.map((item) => ({
        key: item.value ?? 'direct',
        ...referrerLabel(item.value),
        value: item.visitors,
      }))
    : null

  const footnote = data?.other?.visitors
    ? `Plus ${formatNumber(data.other.visitors)} visitors from other sources.`
    : null

  return (
    <BreakdownCard
      id="referrers"
      title="Traffic Sources"
      subtitle="Where visitors came from"
      rows={rows}
      columns={{ label: 'Source', value: 'Visitors' }}
      emptyMessage="No traffic sources were recorded for this period."
      footnote={footnote}
    />
  )
}
