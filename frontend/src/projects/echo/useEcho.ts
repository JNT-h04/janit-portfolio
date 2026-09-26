import { useEffect, useRef, useState } from 'react'
import { fmtBytes, fmtMs, useMeasured, type Metric } from '../../measure/measure'
import { useKeyStatus } from '../keyStatus'
import { announce, MEETING_SAMPLE, sampleFile, useSampleRequests } from '../samples'
import { pollJob, submitRecording, type Job } from './api'

/**
 * Everything ECHO *does*, with nothing about how it looks.
 *
 * Both skins call this, which is what keeps them honest: a feature added here
 * appears on the professional page and the cyberpunk page at the same time,
 * and neither can quietly fall behind the other.
 */
export function useEcho() {
  const keyStatus = useKeyStatus('/api/echo/status')
  const online = keyStatus === 'ready' ? true : keyStatus === 'no-key' ? false : null
  const [job, setJob] = useState<Job | null>(null)
  const [uploadFraction, setUploadFraction] = useState(0)
  const [error, setError] = useState('')
  const [filename, setFilename] = useState('')
  // A ref, not state: the polling loop reads it without being restarted.
  const left = useRef(false)
  const { measured, record } = useMeasured()

  useEffect(() => {
    // React runs this twice in development (mount, clean up, mount again). Without
    // resetting the flag here, the first clean-up would cancel every future poll.
    left.current = false
    // The visitor navigating away must stop the polling loop.
    return () => {
      left.current = true
    }
  }, [])

  async function onFile(file: File) {
    setError('')
    setJob(null)
    setUploadFraction(0)
    setFilename(file.name)
    try {
      const t0 = performance.now()
      const id = await submitRecording(file, setUploadFraction)
      const uploadMs = performance.now() - t0
      setJob({ id, filename: file.name, stage: 'queued', percent: 5, seconds: 0, error: '', minutes: null })
      const finished = await pollJob(id, setJob, () => left.current)
      if (finished?.stage === 'error') {
        setError(finished.error)
        announce({ slug: 'meeting-assistant', ok: false, text: `The minutes failed: ${finished.error}.` })
      }
      if (finished?.stage === 'done' && finished.minutes) {
        const total = performance.now() - t0
        const st = finished.stage_seconds ?? {}
        const turns = finished.minutes.transcript
        const speakers = new Set(turns.map((t) => t.speaker)).size
        const metrics: Metric[] = [
          { label: 'Recording in to minutes out', value: fmtMs(total), source: 'browser' },
          { label: 'Upload, your browser to my server', value: fmtMs(uploadMs), source: 'browser' },
        ]
        if (st.uploading !== undefined)
          metrics.push({ label: 'Hand-off to Gemini (file upload)', value: fmtMs(st.uploading * 1000), source: 'server' })
        if (st.listening !== undefined)
          metrics.push({ label: 'Gemini listening and writing the minutes', value: fmtMs(st.listening * 1000), source: 'server' })
        metrics.push(
          { label: 'Recording size', value: fmtBytes(finished.audio_bytes ?? file.size), source: 'server' },
          { label: 'Speakers / turns found', value: `${speakers} / ${turns.length}`, source: 'model' },
          { label: 'Model that answered', value: finished.model || 'unknown', source: 'server' },
        )
        record(total, metrics)
        const m = finished.minutes
        announce({
          slug: 'meeting-assistant',
          ok: true,
          text: `Minutes ready: "${m.title}". ${speakers} speakers, ${m.decisions.length} ${m.decisions.length === 1 ? 'decision' : 'decisions'} and ${m.actions.length} action ${m.actions.length === 1 ? 'item' : 'items'}, in ${(total / 1000).toFixed(0)} seconds.`,
        })
      }
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err))
      setFilename('')
    }
  }

  /** One click: run the bundled sample meeting through the real pipeline. */
  const trySample = async () => {
    try {
      await onFile(await sampleFile(MEETING_SAMPLE))
    } catch (err) {
      setError((err as Error).message)
    }
  }
  useSampleRequests('meeting-assistant', () => trySample())

  const minutes = job?.minutes ?? null
  const running = job !== null && job.stage !== 'done' && job.stage !== 'error'
  const busy = Boolean(filename) && !minutes && !error

  return { trySample, measured, online, keyStatus, job, uploadFraction, error, filename, minutes, running, busy, onFile }
}
