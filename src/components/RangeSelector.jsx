const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
]

export function RangeSelector({ value, onChange }) {
  return (
    <div className="range-selector" role="group" aria-label="Date range">
      {RANGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="range-option"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
