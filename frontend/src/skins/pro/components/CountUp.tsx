import { animate, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

/**
 * Counts from zero up to `to` the first time it is scrolled into view.
 * Purely decorative: the final number is what matters, so it is also the
 * value screen readers are given.
 */
export default function CountUp({ to, duration = 1.1 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const seen = useInView(ref, { once: true, margin: '-60px' })
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (!seen) return
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    })
    return () => controls.stop()
  }, [seen, to, duration])

  return (
    <span ref={ref} aria-label={String(to)}>
      <span aria-hidden>{shown}</span>
    </span>
  )
}
