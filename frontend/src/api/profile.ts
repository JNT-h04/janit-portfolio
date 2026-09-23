import { useEffect, useState } from 'react'
import { STATIC_BUILD } from '../config'
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
    // The static build has no API to ask, so it starts from the snapshot that
    // was copied out of backend/app/data/profile.json at build time.
    STATIC_BUILD ? { status: 'online', profile: snapshot as Profile } : { status: 'loading' },
  )
  useEffect(() => {
    if (STATIC_BUILD) return
    async function load(){
      try {
        const res = await fetch('/api/profile')
        if (!res.ok) throw new Error(`server replied ${res.status}`)
        const profile = await res.json()
        setState({ status: 'online', profile })
      } catch (error) {
        setState({ status: 'offline', error: (error as Error).message })
      }
    }
    load()
  }, [])
  return state
}
