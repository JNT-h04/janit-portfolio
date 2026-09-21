import { useEffect, useState } from 'react'
import { analyze, getStatus, listSamples, sampleUrl, type Analysis, type Status } from './api'

/** Everything FRACTURE does, with nothing about how it looks. Shared by both skins. */
export function useFracture() {
  const [status, setStatus] = useState<Status | null>(null)
  const [samples, setSamples] = useState<string[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Analysis | null>(null)

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
      setResult(await analyze(blob, name))
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

  return { status, samples, preview, busy, error, result, onFile, onSample, warming }
}
