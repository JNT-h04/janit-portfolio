import { useEffect, useState } from 'react'
import { api } from '../config'

/**
 * Whether a Gemini-backed demo (LEXICON, ECHO) can run.
 *
 * "No answer" and "no key" are different things. The hosted API sleeps when
 * idle and takes about a minute to wake, and during that minute every request
 * fails; reading that as "the server has no key" told visitors the wrong
 * thing. So an unanswered request means `waking`, and we keep asking.
 */
export type KeyStatus = 'checking' | 'ready' | 'no-key' | 'waking' | 'unreachable'

const RETRY_MS = 5000
/** A cold start is ~1 minute; give it three before calling the server down. */
const GIVE_UP_MS = 180_000

async function ask(path: string): Promise<'ready' | 'no-key' | 'no-answer'> {
  try {
    const res = await fetch(api(path))
    if (!res.ok) return 'no-answer'
    return (await res.json()).ready ? 'ready' : 'no-key'
  } catch {
    return 'no-answer'
  }
}

export function useKeyStatus(path: string): KeyStatus {
  const [status, setStatus] = useState<KeyStatus>('checking')

  useEffect(() => {
    // Reset at the start of the effect: StrictMode mounts twice in dev.
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const started = Date.now()

    const check = async () => {
      const answer = await ask(path)
      if (cancelled) return
      if (answer !== 'no-answer') return setStatus(answer)
      if (Date.now() - started > GIVE_UP_MS) return setStatus('unreachable')
      setStatus('waking')
      timer = setTimeout(check, RETRY_MS)
    }
    check()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [path])

  return status
}
