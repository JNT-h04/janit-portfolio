import { useMemo } from 'react'
import { FOCI, PROJECTS, type Focus, type Project } from '../data/projects'

/**
 * Tailored links: one URL per company you apply to.
 *
 *   https://jnt-h04.github.io/janit-portfolio/?view=pro&for=zoho&focus=nlp
 *
 * `for` puts a short greeting for that company on the page and signs the
 * contact form with it; `focus` (nlp, cv, audio, health, genai; several
 * allowed, comma-separated) moves the matching projects to the front. Nothing
 * else changes: same projects, same numbers, same caveats.
 *
 * The query string is gone after the first in-app navigation, so the choice is
 * kept in sessionStorage for the rest of that visit, and only that visit.
 */

const STORAGE_KEY = 'janit.audience'

// Names that don't survive simple capitalisation. Anything else is shown as
// typed, first letter capitalised.
const PROPER_NAMES: Record<string, string> = {
  tcs: 'TCS',
  ibm: 'IBM',
  hcl: 'HCL',
  ltimindtree: 'LTIMindtree',
  jpmorgan: 'JPMorgan',
  jpmc: 'JPMorgan Chase',
  paypal: 'PayPal',
  linkedin: 'LinkedIn',
  nvidia: 'NVIDIA',
  amd: 'AMD',
  sap: 'SAP',
  ey: 'EY',
  pwc: 'PwC',
  kpmg: 'KPMG',
  zs: 'ZS',
  phonepe: 'PhonePe',
  openai: 'OpenAI',
  deepmind: 'DeepMind',
  servicenow: 'ServiceNow',
}

export type Audience = { company: string; focus: Focus[] }

function prettify(raw: string) {
  const key = raw.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (PROPER_NAMES[key]) return PROPER_NAMES[key]
  return raw
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

/** Parse ?for= and ?focus=. Exported so the exact behaviour can be tested. */
export function parseAudience(search: string): Audience | null {
  const params = new URLSearchParams(search)
  // Only letters, digits and a few separators: this text is shown on the page.
  const raw = (params.get('for') ?? '').replace(/[^\p{L}\p{N} &._-]/gu, '').trim().slice(0, 40)
  const focus = (params.get('focus') ?? '')
    .toLowerCase()
    .split(',')
    .map((f) => f.trim())
    .filter((f): f is Focus => (FOCI as readonly string[]).includes(f))
  if (!raw && !focus.length) return null
  return { company: raw ? prettify(raw) : '', focus }
}

function read(): Audience | null {
  const fromUrl = parseAudience(window.location.search)
  try {
    if (fromUrl) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl))
      return fromUrl
    }
    const saved = sessionStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as Audience) : null
  } catch {
    return fromUrl
  }
}

// Read once per page load: the URL is what it is when the site opens.
const AUDIENCE = read()

/** Projects in the order this visitor should see them: focus matches first,
 * live demos before offline ones among those, everything else unchanged. */
export function orderFor(projects: Project[], focus: Focus[]): Project[] {
  if (!focus.length) return projects
  const score = (p: Project) => (p.focus.some((f) => focus.includes(f)) ? (p.online ? 0 : 1) : 2)
  // Array.prototype.sort is stable, so ties keep their original order.
  return [...projects].sort((a, b) => score(a) - score(b))
}

/** Shared by both skins, so a tailored link behaves the same in each. */
export function useAudience() {
  return useMemo(() => {
    const audience = AUDIENCE
    const projects = orderFor(PROJECTS, audience?.focus ?? [])
    return { company: audience?.company ?? '', focus: audience?.focus ?? [], projects, lead: projects[0] }
  }, [])
}
