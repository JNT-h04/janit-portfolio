import { useRef, useState } from 'react'

/**
 * "What I measured": numbers taken from the visitor's own run, never typed in.
 *
 * Each demo hook builds a list of these from two sources: timings the server
 * reports about its own work (inference, model calls) and what the browser
 * saw end to end. The difference between the two is the network and the
 * queue, which is worth showing, because on a free host it is most of it.
 */
export type Metric = {
  label: string
  value: string
  /** where the number comes from, shown small: 'server', 'browser', 'model output' */
  source: 'server' | 'browser' | 'model'
}

export type Measured = {
  metrics: Metric[]
  /** runs this visit, and their median end-to-end time */
  runs: number
  medianMs: number
}

// A non-breaking space keeps "27 ms" on one line in a narrow column.
const unit = (n: string, u: string) => `${n} ${u}`
export const fmtMs = (ms: number) =>
  ms >= 10_000 ? unit((ms / 1000).toFixed(1), 's') : ms >= 1000 ? unit((ms / 1000).toFixed(2), 's') : unit(String(Math.round(ms)), 'ms')
export const fmtBytes = (n: number) =>
  n >= 1 << 20 ? unit((n / (1 << 20)).toFixed(1), 'MB') : unit(String(Math.max(1, Math.round(n / 1024))), 'KB')
export const fmtPct = (p: number) => `${(p * 100).toFixed(1)}%`

export function median(xs: number[]) {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** A stopwatch for one kind of run, plus the history needed for a median. */
export function useMeasured() {
  const [measured, setMeasured] = useState<Measured | null>(null)
  const history = useRef<number[]>([])

  /** Record a finished run: its end-to-end time and what to show about it. */
  const record = (totalMs: number, metrics: Metric[]) => {
    history.current.push(totalMs)
    setMeasured({ metrics, runs: history.current.length, medianMs: median(history.current) })
  }

  return { measured, record }
}
