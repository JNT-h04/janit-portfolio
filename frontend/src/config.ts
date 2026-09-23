/**
 * Where this build's API lives, and what it may therefore claim.
 *
 * Locally the Vite dev server proxies /api to FastAPI on port 8000, so the
 * relative path just works. The published copy is served from GitHub Pages,
 * which has no backend of its own, so it is given the API's full origin at
 * build time through VITE_API_BASE.
 *
 * If no API is configured at all, the site must not offer demos it cannot run:
 * `HAS_API` is what every "live demo" label and every demo panel checks first.
 */
const rawBase = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

/** '' when the API is same-origin (dev), otherwise the API's origin. */
export const API_BASE = rawBase.replace(/\/+$/, '')

/** Build an API URL: api('/api/lexicon/status'). */
export const api = (path: string) => `${API_BASE}${path}`

/** True when there is an API to talk to at all. */
export const HAS_API = import.meta.env.VITE_STATIC !== 'true' || API_BASE !== ''

/**
 * The published build starts from a committed snapshot of the profile so the
 * page is never empty while a sleeping API wakes up; the real answer replaces
 * it as soon as it arrives.
 */
export const USE_SNAPSHOT = import.meta.env.VITE_STATIC === 'true'
