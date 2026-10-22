import { useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { signIn } from '../api/client.js'
import { Brand } from './Brand.jsx'
import '../styles/login.css'

function loginErrorMessage(error) {
  switch (error?.code) {
    case 'invalid_password':
      return "That password isn't right. Please try again."
    case 'bad_request':
      return 'Please enter the dashboard password.'
    case 'config':
      return 'The dashboard is not fully set up yet. Please contact your website administrator.'
    case 'network':
      return "We couldn't reach the server. Please check your internet connection and try again."
    default:
      return "We couldn't sign you in right now. Please try again."
  }
}

export function Login({ notice, onSignedIn }) {
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!password) {
      setError(loginErrorMessage({ code: 'bad_request' }))
      inputRef.current?.focus()
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await signIn(password)
      setPassword('')
      onSignedIn()
    } catch (err) {
      setError(loginErrorMessage(err))
      setSubmitting(false)
      inputRef.current?.select()
    }
  }

  const message = error ?? notice

  return (
    <main className="login-page">
      <div className="login-card card">
        <Brand size="lg" />

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="password" className="field-label">Password</label>
          <input
            ref={inputRef}
            id="password"
            name="password"
            type="password"
            className="field-input"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={message ? 'login-message' : undefined}
            disabled={submitting}
          />

          {message && (
            <p id="login-message" className={`login-message ${error ? 'is-error' : ''}`} role="alert">
              {error && <AlertCircle size={16} aria-hidden="true" />}
              {message}
            </p>
          )}

          <button type="submit" className="button button--primary button--block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  )
}
