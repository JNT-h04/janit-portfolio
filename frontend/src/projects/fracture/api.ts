import { api } from '../../config'
// Talking to the FRACTURE backend (backend/app/routers/fracture.py).

export type Status = {
  state: 'idle' | 'loading' | 'ready' | 'missing' | 'error'
  detail: string
  load_seconds: number | null
}

export type Analysis = {
  severity: 'Minor' | 'Moderate' | 'No_Crack' | 'Severe'
  confidence: number
  probabilities: Record<string, number>
  intensity: number
  age: string
  cause: string
  angle: number | null
  advice: string
  edges_image: string
  lines_image: string
  model: string
  timings_ms: { decode: number; inference: number; analysis: number }
}

async function detail(res: Response) {
  try {
    return String((await res.json()).detail ?? `error ${res.status}`)
  } catch {
    return `error ${res.status}`
  }
}

export async function getStatus(): Promise<Status> {
  try {
    const res = await fetch(api('/api/fracture/status'))
    if (!res.ok) throw new Error()
    return await res.json()
  } catch {
    return { state: 'error', detail: 'backend uplink offline', load_seconds: null }
  }
}

export async function listSamples(): Promise<string[]> {
  try {
    const res = await fetch(api('/api/fracture/samples'))
    return res.ok ? await res.json() : []
  } catch {
    return []
  }
}

export const sampleUrl = (name: string) => api(`/api/fracture/samples/${name}`)

export async function analyze(file: Blob, filename = 'upload.jpg'): Promise<Analysis> {
  const form = new FormData()
  form.append('file', file, filename)
  const res = await fetch(api('/api/fracture/analyze'), { method: 'POST', body: form })
  if (!res.ok) throw new Error(await detail(res))
  return res.json()
}
