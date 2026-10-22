import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { getSession } from './api/client.js'
import { BrandMark } from './components/Brand.jsx'
import { ErrorState } from './components/ErrorState.jsx'
import { Login } from './components/Login.jsx'

// The dashboard (and its charting library) only loads after signing in.
const Dashboard = lazy(() => import('./components/Dashboard.jsx').then((m) => ({ default: m.Dashboard })))

const EXPIRED_NOTICE = 'Your session has ended. Please sign in again.'

function PageLoading() {
  return (
    <main className="centered-page" aria-busy="true">
      <BrandMark size={48} />
      <span className="visually-hidden" role="status">Loading…</span>
    </main>
  )
}

export default function App() {
  // status: 'checking' | 'signed-in' | 'signed-out' | 'error'
  const [auth, setAuth] = useState({ status: 'checking', notice: null, error: null })
  const [checkCount, setCheckCount] = useState(0)

  useEffect(() => {
    let active = true
    getSession()
      .then((session) => {
        if (active) setAuth({ status: session.authenticated ? 'signed-in' : 'signed-out', notice: null, error: null })
      })
      .catch((error) => {
        if (active) setAuth({ status: 'error', notice: null, error })
      })
    return () => {
      active = false
    }
  }, [checkCount])

  const handleSessionExpired = useCallback(() => {
    setAuth({ status: 'signed-out', notice: EXPIRED_NOTICE, error: null })
  }, [])

  switch (auth.status) {
    case 'signed-in':
      return (
        <Suspense fallback={<PageLoading />}>
          <Dashboard
            onSignedOut={() => setAuth({ status: 'signed-out', notice: null, error: null })}
            onSessionExpired={handleSessionExpired}
          />
        </Suspense>
      )
    case 'signed-out':
      return (
        <Login
          notice={auth.notice}
          onSignedIn={() => setAuth({ status: 'signed-in', notice: null, error: null })}
        />
      )
    case 'error':
      return (
        <main className="centered-page">
          <ErrorState
            error={auth.error}
            onRetry={() => {
              setAuth({ status: 'checking', notice: null, error: null })
              setCheckCount((count) => count + 1)
            }}
          />
        </main>
      )
    default:
      return <PageLoading />
  }
}
