import { useEffect, useState } from 'react'
import { getAnalytics } from '../api/client.js'

// Loads analytics for a range. Previously loaded data for the same range stays
// on screen while a refresh is in flight, so the layout never jumps.
export function useAnalytics(range, onUnauthorized) {
  const [reloadCount, setReloadCount] = useState(0)
  const requestKey = `${range}:${reloadCount}`
  const [result, setResult] = useState({ key: null, data: null, error: null })

  useEffect(() => {
    const controller = new AbortController()

    getAnalytics(range, controller.signal)
      .then((data) => setResult({ key: requestKey, data, error: null }))
      .catch((error) => {
        if (controller.signal.aborted) return
        if (error.status === 401) {
          onUnauthorized()
          return
        }
        // Keep the old numbers only if they're for the range being shown.
        setResult((previous) => ({
          key: requestKey,
          data: previous.data?.range.key === range ? previous.data : null,
          error,
        }))
      })

    return () => controller.abort()
  }, [range, requestKey, onUnauthorized])

  return {
    data: result.data,
    error: result.error,
    loading: result.key !== requestKey,
    refresh: () => setReloadCount((count) => count + 1),
  }
}
