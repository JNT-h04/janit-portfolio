import { useEffect, useState } from 'react'
import { fmtMs, fmtPct, useMeasured } from '../../measure/measure'
import { analyze, getStatus, listSamples, sampleUrl, type Analysis, type Status } from './api'

/** Everything FRACTURE does, with nothing about how it looks. Shared by both skins. */
export function useFracture() {
  const [status, setStatus] = useState<Status | null>(null)
  const [samples, setSamples] = useState<string[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Analysis | null>(null)
  const { measured, record } = useMeasured()

  // Ask how the model is doing, and keep asking while it warms up.
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
    return () => {
      left = true
      clearTimeout(timer)
    }
  }, [])

  const run = async (blob: Blob, name: string, previewUrl: string) => {
    setBusy(true)
    setError('')
    setResult(null)
    setPreview(previewUrl)
    try {
      const t0 = performance.now()
      const res = await analyze(blob, name)
      const total = performance.now() - t0
      const t = res.timings_ms
      const server = t.decode + t.inference + t.analysis
      setResult(res)
      record(total, [
        { label: 'Round trip, your browser to the model and back', value: fmtMs(total), source: 'browser' },
        { label: 'Model inference (ResNet50 forward pass)', value: fmtMs(t.inference), source: 'server' },
        { label: 'Image decode + edge and line analysis', value: fmtMs(t.decode + t.analysis), source: 'server' },
        { label: 'Network, upload and queueing', value: fmtMs(Math.max(0, total - server)), source: 'browser' },
        { label: 'Top-class confidence', value: fmtPct(res.confidence), source: 'model' },
        { label: 'Runtime', value: res.model, source: 'server' },
      ])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onFile = (file: File) => run(file, file.name, URL.createObjectURL(file))

  const onSample = async (name: string) => {
    const blob = await (await fetch(sampleUrl(name))).blob()
    run(blob, name, sampleUrl(name))
  }

  const warming = status?.state === 'loading' || status?.state === 'idle'

  return { status, samples, preview, busy, error, result, onFile, onSample, warming, measured }
}
