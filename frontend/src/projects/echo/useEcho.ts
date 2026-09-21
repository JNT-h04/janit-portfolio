import { useEffect, useRef, useState } from 'react'
import { getStatus, pollJob, submitRecording, type Job } from './api'

/**
 * Everything ECHO *does*, with nothing about how it looks.
 *
 * Both skins call this, which is what keeps them honest: a feature added here
 * appears on the professional page and the cyberpunk page at the same time,
 * and neither can quietly fall behind the other.
 */
export function useEcho() {
  const [online, setOnline] = useState<boolean | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [uploadFraction, setUploadFraction] = useState(0)
  const [error, setError] = useState('')
  const [filename, setFilename] = useState('')
  // A ref, not state: the polling loop reads it without being restarted.
  const left = useRef(false)

  useEffect(() => {
    // React runs this twice in development (mount, clean up, mount again). Without
    // resetting the flag here, the first clean-up would cancel every future poll.
    left.current = false
    getStatus().then(setOnline)
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
      const id = await submitRecording(file, setUploadFraction)
      setJob({ id, filename: file.name, stage: 'queued', percent: 5, seconds: 0, error: '', minutes: null })
      const finished = await pollJob(id, setJob, () => left.current)
      if (finished?.stage === 'error') setError(finished.error)
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err))
      setFilename('')
    }
  }

  const minutes = job?.minutes ?? null
  const running = job !== null && job.stage !== 'done' && job.stage !== 'error'
  const busy = Boolean(filename) && !minutes && !error

  return { online, job, uploadFraction, error, filename, minutes, running, busy, onFile }
}
