import { useState } from 'react'

// The shape of the JSON your backend will send from GET /api/profile.
// Keep it in sync with backend/app/data/profile.json.
export type Profile = {
  name: string
  role: string
  location: string
  summary: string
  links: { label: string; url: string }[]
  skills: { name: string; level: number }[] // level 0-100 drives the stat bars
  experience: { company: string; title: string; period: string; points: string[] }[]
}

export type ProfileState =
  | { status: 'loading' }
  | { status: 'offline'; error: string }
  | { status: 'online'; profile: Profile }

/**
 * ─── YOUR EXERCISE (see LEARNING.md, Mission 1) ───────────────────────────
 * Right now this hook never calls the backend. It always reports "offline",
 * so the Home page shows NO SIGNAL.
 *
 * Make it:
 *   1. call fetch('/api/profile') once when the component mounts (useEffect)
 *   2. set { status: 'online', profile } when the response is ok
 *   3. set { status: 'offline', error } when the request fails or !res.ok
 *
 * When it works, the profile panel on the home page fills in by itself.
 */
export function useProfile(): ProfileState {
  const [state] = useState<ProfileState>({ status: 'offline', error: 'uplink not implemented yet' })
  return state
}
