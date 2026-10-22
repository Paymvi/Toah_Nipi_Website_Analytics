export function BrandMark({ size = 40 }) {
  return (
    <svg
      className="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="40" height="40" rx="11" fill="#1f4d3a" />
      <path
        d="M20 7.5 26.5 16.5h-3.2l5.2 7.5h-4.4L30 31H10l5.9-7h-4.4l5.2-7.5h-3.2Z"
        fill="#f7f3ea"
      />
      <rect x="18.6" y="30.5" width="2.8" height="3.5" rx="0.6" fill="#f7f3ea" />
    </svg>
  )
}

export function Brand({ as: Heading = 'h1', size = 'md' }) {
  return (
    <div className={`brand brand--${size}`}>
      <BrandMark size={size === 'lg' ? 48 : 40} />
      <div className="brand-text">
        <span className="brand-name">Toah Nipi</span>
        <Heading className="brand-title">Website Analytics</Heading>
      </div>
    </div>
  )
}
