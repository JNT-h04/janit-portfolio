import { useRef, type MouseEvent, type ReactNode } from 'react'

/**
 * The element leans towards the cursor while it is nearby and springs back when
 * it leaves. Used on the hero buttons: it makes them feel physical without
 * anything moving until someone actually reaches for them.
 */
export default function Magnetic({
  children,
  strength = 0.35,
  className = '',
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  const onMove = (e: MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`
  }

  const onLeave = () => {
    const el = ref.current
    if (el) el.style.transform = ''
  }

  return (
    <span
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`inline-block transition-transform duration-300 ease-out ${className}`}
    >
      {children}
    </span>
  )
}
