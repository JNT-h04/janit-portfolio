import { api } from '../../config'
// Talking to the CORTEX backend (backend/app/routers/cortex.py).

export type Status = {
  state: 'idle' | 'loading' | 'ready' | 'missing' | 'error'
  detail: string
  load_seconds: number | null
  classes: string[]
  excluded: string[]
}

export type Analysis = {
  prediction: string
  confidence: number
  probabilities: Record<string, number>
  excluded: string[]
  input_image: string
  heatmap_image: string
  overlay_image: string
  focus: string
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
    const res = await fetch(api('/api/cortex/status'))
    if (!res.ok) throw new Error()
    return await res.json()
  } catch {
    return { state: 'error', detail: 'backend uplink offline', load_seconds: null, classes: [], excluded: [] }
  }
}

export async function listSamples(): Promise<string[]> {
  try {
    const res = await fetch(api('/api/cortex/samples'))
    return res.ok ? await res.json() : []
  } catch {
    return []
  }
}

export const sampleUrl = (name: string) => `/api/cortex/samples/${name}`

export async function analyze(file: Blob, filename = 'scan.jpg'): Promise<Analysis> {
  const form = new FormData()
  form.append('file', file, filename)
  const res = await fetch(api('/api/cortex/analyze'), { method: 'POST', body: form })
  if (!res.ok) throw new Error(await detail(res))
  return res.json()
}

export type SliceResult = { name: string; prediction: string; confidence: number }

export type SeriesAnalysis = {
  prediction: string
  confidence: number
  probabilities: Record<string, number>
  agreement: number
  slices: SliceResult[]
  best_slice: string
  input_image: string
  overlay_image: string
  focus: string
}

export type SampleSeries = { id: string; label: string; slices: string[] }

export async function listSeries(): Promise<SampleSeries[]> {
  try {
    const res = await fetch(api('/api/cortex/series'))
    return res.ok ? await res.json() : []
  } catch {
    return []
  }
}

/** Send several slices of one patient; the backend averages their predictions. */
export async function analyzeSeries(files: { blob: Blob; name: string }[]): Promise<SeriesAnalysis> {
  const form = new FormData()
  for (const f of files) form.append('files', f.blob, f.name)
  const res = await fetch(api('/api/cortex/analyze-series'), { method: 'POST', body: form })
  if (!res.ok) throw new Error(await detail(res))
  return res.json()
}
