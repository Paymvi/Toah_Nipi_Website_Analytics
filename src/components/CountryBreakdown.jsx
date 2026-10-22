import { formatNumber } from '../lib/format.js'
import { countryLabel } from '../lib/labels.js'
import { BreakdownCard } from './BreakdownCard.jsx'

export function CountryBreakdown({ data }) {
  const rows = data
    ? data.items.map((item) => ({
        key: item.value ?? 'unknown',
        label: countryLabel(item.value),
        value: item.visitors,
      }))
    : null

  const footnote = data?.other?.visitors
    ? `Plus ${formatNumber(data.other.visitors)} visitors from other countries.`
    : null

  return (
    <BreakdownCard
      id="countries"
      title="Countries"
      subtitle="Where visitors are located"
      rows={rows}
      columns={{ label: 'Country', value: 'Visitors' }}
      shareOf={data?.totals.visitors}
      emptyMessage="No location information was recorded for this period."
      footnote={footnote}
    />
  )
}
