import { AlertCircle, RotateCw } from 'lucide-react'
import { describeError } from '../lib/errors.js'

export function ErrorState({ error, onRetry }) {
  const { title, message } = describeError(error)
  return (
    <section className="card error-state" role="alert">
      <AlertCircle className="error-state-icon" size={28} aria-hidden="true" />
      <h2 className="error-state-title">{title}</h2>
      <p className="error-state-message">{message}</p>
      {onRetry && (
        <button type="button" className="button button--primary" onClick={onRetry}>
          <RotateCw size={16} aria-hidden="true" />
          Try again
        </button>
      )}
    </section>
  )
}

// Smaller variant shown above existing data when a refresh fails.
export function InlineNotice({ error }) {
  const { message } = describeError(error)
  return (
    <p className="inline-notice" role="status">
      <AlertCircle size={16} aria-hidden="true" />
      <span>{message} The figures below are from the last successful update.</span>
    </p>
  )
}
