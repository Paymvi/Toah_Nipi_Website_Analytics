// Server-only configuration. Values come from Vercel environment variables and
// must never be sent to the browser.

export class ConfigError extends Error {
  constructor(missing) {
    super(`Missing or invalid server configuration: ${missing.join(', ')}`)
    this.name = 'ConfigError'
    this.missing = missing
  }
}

const MIN_SECRET_LENGTH = 32

function read(name) {
  const value = process.env[name]
  return typeof value === 'string' ? value.trim() : ''
}

export function getAuthConfig() {
  const password = read('ANALYTICS_DASHBOARD_PASSWORD')
  const sessionSecret = read('ANALYTICS_SESSION_SECRET')

  const problems = []
  if (!password) problems.push('ANALYTICS_DASHBOARD_PASSWORD')
  if (sessionSecret.length < MIN_SECRET_LENGTH) {
    problems.push(`ANALYTICS_SESSION_SECRET (must be at least ${MIN_SECRET_LENGTH} characters)`)
  }
  if (problems.length) throw new ConfigError(problems)

  return { password, sessionSecret }
}

export function getVercelConfig() {
  const token = read('VERCEL_ANALYTICS_TOKEN')
  const projectId = read('VERCEL_ANALYTICS_PROJECT_ID')
  // Optional: only needed when the project belongs to a team.
  const teamId = read('VERCEL_ANALYTICS_TEAM_ID') || null

  const problems = []
  if (!token) problems.push('VERCEL_ANALYTICS_TOKEN')
  if (!projectId) problems.push('VERCEL_ANALYTICS_PROJECT_ID')
  if (problems.length) throw new ConfigError(problems)

  return { token, projectId, teamId }
}

// Secure cookies everywhere except local development (`vercel dev` sets
// VERCEL_ENV=development; plain Node has no VERCEL_ENV at all).
export function isLocalDevelopment() {
  const env = process.env.VERCEL_ENV
  return !env || env === 'development'
}
