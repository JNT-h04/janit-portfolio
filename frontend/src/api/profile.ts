import { useEffect, useState } from 'react'
import { USE_SNAPSHOT, api } from '../config'
import snapshot from '../data/profile.snapshot.json'

// The shape of the JSON your backend will send from GET /api/profile.
// Keep it in sync with backend/app/data/profile.json.
export type Profile = {
  name: string
  role: string
  location: string
  tagline: string
  about: string[]
  highlights: string[]
  skills: { group: string; items: string[] }[]
  experience: {
    company: string
    url?: string
    about: string
    title: string
    period: string
    location?: string
    points: string[]
    stack: string[]
  }[]
  education: { school: string; degree: string; period: string; detail: string }[]
  certifications: string[]
  links: { label: string; url: string }[]
}

export type ProfileState =
  | { status: 'loading' }
  | { status: 'offline'; error: string }
  | { status: 'online'; profile: Profile }

export function useProfile(): ProfileState {
  const [state, setState] = useState<ProfileState>(
    // The published build starts from the snapshot copied out of
    // backend/app/data/profile.json, so the page has content immediately even
    // while a sleeping API wakes up. The live answer replaces it below.
    USE_SNAPSHOT ? { status: 'online', profile: snapshot as Profile } : { status: 'loading' },
  )
  useEffect(() => {
    async function load(){
      try {
        const res = await fetch(api('/api/profile'))
        if (!res.ok) throw new Error(`server replied ${res.status}`)
        const profile = await res.json()
        setState({ status: 'online', profile })
      } catch (error) {
        // With a snapshot already on screen, a failed fetch changes nothing:
        // the visitor keeps reading real data instead of watching it vanish.
        if (!USE_SNAPSHOT) setState({ status: 'offline', error: (error as Error).message })
      }
    }
    load()
  }, [])
  return state
}
