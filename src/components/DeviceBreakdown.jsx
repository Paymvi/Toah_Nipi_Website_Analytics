import { HelpCircle, Monitor, Smartphone, Tablet } from 'lucide-react'
import { deviceLabel } from '../lib/labels.js'
import { BreakdownCard } from './BreakdownCard.jsx'

const ICONS = { desktop: Monitor, mobile: Smartphone, tablet: Tablet }

export function DeviceBreakdown({ data }) {
  const rows = data
    ? [...data.items, ...(data.other ? [{ value: 'Other', ...data.other }] : [])].map((item) => {
        const Icon = ICONS[item.value?.toLowerCase()] ?? HelpCircle
        return {
          key: item.value ?? 'unknown',
          label: deviceLabel(item.value),
          icon: <Icon size={16} className="breakdown-icon" aria-hidden="true" />,
          value: item.visitors,
        }
      })
    : null

  return (
    <BreakdownCard
      id="devices"
      title="Devices"
      subtitle="Share of visitors by device"
      rows={rows}
      columns={{ label: 'Device', value: 'Visitors' }}
      shareOf={data?.totals.visitors}
      emptyMessage="No device information was recorded for this period."
    />
  )
}
