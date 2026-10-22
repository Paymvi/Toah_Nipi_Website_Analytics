const GENERIC = "We couldn't load the website analytics right now. Please try again."

// Codes whose server message is already written for the CEO and safe to show as-is.
const TITLES = {
  config: 'Dashboard setup is incomplete',
  vercel_auth: 'Analytics connection needs attention',
  vercel_setup: 'Analytics connection needs attention',
  vercel_busy: 'Analytics service is busy',
}

export function describeError(error) {
  if (error?.code === 'network') {
    return {
      title: "Can't connect right now",
      message: "We couldn't reach the analytics service. Please check your internet connection and try again.",
    }
  }
  if (error?.code in TITLES) {
    return { title: TITLES[error.code], message: error.message || GENERIC }
  }
  return { title: 'Analytics unavailable', message: GENERIC }
}
