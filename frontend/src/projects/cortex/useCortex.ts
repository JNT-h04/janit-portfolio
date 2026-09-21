import { useEffect, useState } from 'react'
import {
  analyze,
  analyzeSeries,
  getStatus,
  listSamples,
  listSeries,
  sampleUrl,
  type Analysis,
  type SampleSeries,
  type SeriesAnalysis,
  type Status,
} from './api'

// Sample files are named after their true label, e.g. very-mild-1.jpg.
const TRUE_LABEL: Record<string, string> = {
  mild: 'Mild Dementia',
  'non-demented': 'Non Demented',
  'very-mild': 'Very mild Dementia',
}
export const labelOf = (file: string) => TRUE_LABEL[file.replace(/-\d+\.jpg$/, '')] ?? ''

/** Everything CORTEX does, with nothing about how it looks. Shared by both skins. */
export function useCortex() {
  const [status, setStatus] = useState<Status | null>(null)
  const [samples, setSamples] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Analysis | null>(null)
  const [heat, setHeat] = useState(0.75) // how strongly the heatmap shows over the scan
  const [truth, setTruth] = useState('') // known label, when a sample was used
  const [mode, setMode] = useState<'slice' | 'series'>('slice')
  const [series, setSeries] = useState<SampleSeries[]>([])
  const [seriesResult, setSeriesResult] = useState<SeriesAnalysis | null>(null)

  useEffect(() => {
    let timer: number
    let left = false
    const poll = async () => {
      const s = await getStatus()
      if (left) return
      setStatus(s)
      if (s.state === 'loading' || s.state === 'idle') timer = window.setTimeout(poll, 1500)
    }
    poll()
    listSamples().then((list) => !left && setSamples(list))
    listSeries().then((list) => !left && setSeries(list))
    return () => {
      left = true
      clearTimeout(timer)
    }
  }, [])

  const runSeries = async (files: { blob: Blob; name: string }[], label = '') => {
    setBusy(true)
    setError('')
    setResult(null)
    setSeriesResult(null)
    setTruth(label)
    try {
      setSeriesResult(await analyzeSeries(files))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onSampleSeries = async (item: SampleSeries) => {
    const files = await Promise.all(
      item.slices.map(async (url) => ({
        blob: await (await fetch(url)).blob(),
        name: url.split('/').pop() ?? 'slice.jpg',
      })),
    )
    runSeries(files, item.label)
  }

  const run = async (blob: Blob, name: string) => {
    setBusy(true)
    setError('')
    setResult(null)
    setSeriesResult(null)
    try {
      setResult(await analyze(blob, name))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onSample = async (name: string) => {
    setTruth(labelOf(name))
    run(await (await fetch(sampleUrl(name))).blob(), name)
  }

  const onFile = (file: File) => {
    setTruth('')
    run(file, file.name)
  }

  const onFiles = (files: File[]) => runSeries(files.map((f) => ({ blob: f, name: f.name })))

  /** Switching mode clears whatever was on screen, so the two modes never mix results. */
  const switchMode = (next: 'slice' | 'series') => {
    setMode(next)
    setResult(null)
    setSeriesResult(null)
    setError('')
    setTruth('')
  }

  // Both modes produce the same shape of reading, so the panel is shared.
  const view = result ?? seriesResult
  const warming = status?.state === 'loading' || status?.state === 'idle'

  return {
    status,
    samples,
    series,
    busy,
    error,
    result,
    seriesResult,
    view,
    heat,
    setHeat,
    truth,
    mode,
    switchMode,
    warming,
    onFile,
    onFiles,
    onSample,
    onSampleSeries,
  }
}
