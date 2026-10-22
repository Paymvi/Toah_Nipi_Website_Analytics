# Toah Nipi · Website Analytics

## What this is

An internal executive dashboard that shows the visitor analytics for Toah Nipi Christian Retreat Center's public website, **toahnipi.org**. It lets leadership see traffic without needing access to the Vercel developer dashboard.

It shows:

- **Visitors**, **Page Views** and **Pages / Visitor** for the last 7 or 30 days, each compared with the period just before it
- A daily traffic chart (with an accessible "Show daily numbers" table)
- Top pages, traffic sources, devices, countries and browsers

All figures come from Vercel's official [Web Analytics API](https://vercel.com/docs/analytics/web-analytics-api), the same data behind Vercel's own Web Analytics dashboard. Nothing is estimated or invented. Bounce rate is deliberately **not** shown, because the public API does not provide the session-level data needed to calculate it accurately.

The dashboard is protected by a shared password.

## How it works

```
Browser (React SPA)  ──►  /api/* Vercel Functions  ──►  api.vercel.com Web Analytics API
     no secrets             holds the token,              (server-to-server only)
                            checks the session
```

| Path | Purpose |
| --- | --- |
| `src/` | React frontend (Vite). Talks **only** to this app's own `/api` endpoints. |
| `api/auth/login.js` | `POST`: checks the password and sets the signed session cookie |
| `api/auth/session.js` | `GET`: reports whether the browser is signed in |
| `api/auth/logout.js` | `POST`: clears the session cookie |
| `api/analytics.js` | `GET ?range=7d\|30d`: returns the dashboard data (requires a session) |
| `api/_lib/` | Shared server code: config, sessions, the Vercel API client and data shaping. Folders starting with `_` are not deployed as endpoints. |
| `tests/` | Tests for the server functions (`npm test`) |

## Local setup

Requirements: Node.js 20 or newer, and npm.

```bash
npm install
cp .env.example .env.local    # then fill in the values (see below)
```

`.env.local` is ignored by Git. Never commit it.

## Environment variables

All five are **server-side only**. None of them may use a `VITE_` prefix, because Vite would then bundle the value into the public JavaScript.

| Variable | Required | What it is |
| --- | --- | --- |
| `VERCEL_ANALYTICS_TOKEN` | Yes | A Vercel access token that can read the website project's analytics |
| `VERCEL_ANALYTICS_PROJECT_ID` | Yes | The ID of the Vercel project that hosts **toahnipi.org** (starts with `prj_`) |
| `VERCEL_ANALYTICS_TEAM_ID` | Only for team projects | The ID of the Vercel team that owns that project (starts with `team_`). Leave it empty if the project belongs to a personal Vercel account. |
| `ANALYTICS_DASHBOARD_PASSWORD` | Yes | The shared password people type to sign in |
| `ANALYTICS_SESSION_SECRET` | Yes | A long random string (at least 32 characters) used to sign session cookies |

### Where to find each value

- **`VERCEL_ANALYTICS_TOKEN`**: in Vercel, open your avatar menu, then **Account Settings → Tokens** (vercel.com/account/tokens). Create a token whose scope is the team (or personal account) that owns the toahnipi.org project, and give it an expiration date you'll remember to renew. The token is only shown once.
- **`VERCEL_ANALYTICS_PROJECT_ID`**: open the **toahnipi.org website project** (not this dashboard's project), then **Settings → General → Project ID**.
- **`VERCEL_ANALYTICS_TEAM_ID`**: open the team, then **Settings → General → Team ID**. Skip this for personal-account projects.
- **`ANALYTICS_DASHBOARD_PASSWORD`**: choose a strong passphrase and share it only with the people who should see the dashboard.
- **`ANALYTICS_SESSION_SECRET`**: generate one with:

  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```

Web Analytics must also be **enabled on the toahnipi.org project** (Project → Analytics tab). The site must be sending page views to it.

Changing `ANALYTICS_DASHBOARD_PASSWORD` or `ANALYTICS_SESSION_SECRET` signs everyone out immediately.

## Vercel setup

Deploy this dashboard as its **own Vercel project**, separate from the toahnipi.org website project.

1. In Vercel, choose **Add New… → Project** and import this repository. Vercel detects Vite automatically (build command `npm run build`, output directory `dist`). The `api/` folder is deployed as Vercel Functions automatically.
2. Open the dashboard project's **Settings → Environment Variables** and add the five variables above. Enable them for **Production**, and for **Preview** too if you use preview deployments.
3. Redeploy after adding or changing variables. Running deployments don't pick up new values.

`vercel.json` adds security headers only: no framing, no search indexing, and a strict Content Security Policy. It has no SPA rewrite, because the app has no client-side routes, so nothing can intercept `/api/*`.

## Running locally

There are two ways to run the app:

| Command | What runs | Use it for |
| --- | --- | --- |
| `npm run dev` | Vite only, at http://localhost:5173 | Quick styling work. **The `/api` functions do not run**, so the app shows an "Analytics unavailable" message. |
| `vercel dev` (or `npm run dev:full`) | Vite **plus** the `/api` functions, at http://localhost:3000 | Real end-to-end testing: sign-in, sessions and live analytics |

To use `vercel dev`:

```bash
npm install -g vercel        # one-time: install the Vercel CLI
vercel login                 # one-time
vercel link                  # one-time: link this folder to the dashboard's Vercel project
vercel env pull .env.local   # optional: download the Development env vars into .env.local
vercel dev
```

`vercel dev` reads variables from `.env.local`. If you pulled them from Vercel, make sure they're also set for the **Development** environment there, or fill in `.env.local` by hand. Locally the session cookie is sent without the `Secure` flag so it works over plain `http://localhost`. On deployed environments it is always `Secure`.

### Other commands

```bash
npm test         # server function tests (auth, validation, data shaping, error handling)
npm run lint     # ESLint
npm run build    # production build into dist/
```

## Deployment

After the one-time Vercel setup above:

- **With Git:** push to the branch connected to the Vercel project (usually `main`) and Vercel builds and deploys automatically.
- **With the CLI:** `vercel` for a preview deployment, `vercel --prod` for production.

After deploying, open the production URL, sign in, and check that the numbers match the toahnipi.org project's **Analytics** tab in Vercel for the same period.

## Security

- **Vercel API credentials stay on the server.** The access token is read only inside the `/api` functions. The browser never contacts `api.vercel.com` and never receives the token, the session secret or the dashboard password.
- **Access requires a signed session.** Signing in sets an `HttpOnly`, `SameSite=Strict` cookie (also `Secure` on deployed environments) that lasts 12 hours. It is signed with HMAC-SHA256 using `ANALYTICS_SESSION_SECRET` and Node's built-in `crypto`. JavaScript cannot read it, and nothing is kept in `localStorage` or `sessionStorage`.
- **`/api/analytics` returns `401`** without a valid session and never calls Vercel in that case.
- **Input is validated.** Only the `7d` and `30d` ranges are accepted. Dates are calculated on the server.
- **Errors are safe.** The browser gets short, plain-language messages. Technical details go to the server logs (Vercel → Project → Logs) without tokens or passwords.
- **Never commit secret files.** `.env`, `.env.local` and every other `.env.*` file (except `.env.example`) are ignored by Git. If a token is ever exposed, revoke it in Vercel → Account Settings → Tokens and create a new one.

This is a shared-password MVP. Wrong passwords are slowed down slightly, but there is no per-user account system or lockout. For individual logins, put the dashboard behind Vercel's Deployment Protection or an identity provider later.

## How the numbers are defined

- **Visitors / Page Views**: totals for the selected period, as reported by Vercel for production traffic on toahnipi.org.
- **Pages / Visitor**: page views ÷ visitors, shown to one decimal place ("—" if there were no visitors).
- **Comparison**: the same metric for the period of equal length immediately before the selected one. For "Last 7 days", that is days 8–14 ago, up to the same time of day. If the previous period had no traffic, the card says so instead of showing a percentage.
- **Days** are calendar days in **UTC**, matching how Vercel groups its data. "Last 7 days" means today (so far) plus the six days before it.
- **Breakdowns** show Vercel's top results. Vercel groups everything beyond the top results into "other", and the dashboard shows that as a short note under the list.
