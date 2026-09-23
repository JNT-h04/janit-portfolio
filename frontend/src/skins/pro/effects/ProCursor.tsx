import { useEffect, useRef } from 'react'

/** What counts as "you can click this". */
const INTERACTIVE = 'a, button, input, textarea, select, summary, label, [role="button"], [tabindex]'

/**
 * The professional skin's pointer: an ink dot exactly under the finger, a ring
 * that follows a beat behind and opens up over anything clickable, and a warm
 * wash that lights the paper where you are reading.
 *
 * Nothing here goes through React — mouse events only record a position and one
 * requestAnimationFrame loop moves three nodes — so moving the mouse never
 * triggers a render. The ring and the wash lag by different amounts, which is
 * what makes it feel like weight rather than a sticker on the cursor.
 */
export default function ProCursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const washRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // A touch screen has no pointer to decorate, and a visitor who asked for
    // less motion should keep their own cursor.
    if (!matchMedia('(pointer: fine)').matches) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const dot = dotRef.current
    const ring = ringRef.current
    const wash = washRef.current
    if (!dot || !ring || !wash) return

    document.documentElement.classList.add('has-pro-cursor')

    const mouse = { x: innerWidth / 2, y: innerHeight / 2 }
    const ringAt = { ...mouse }
    const washAt = { ...mouse }
    let hot = 0 // 0 idle, 1 over something clickable
    let want = 0
    let press = 1
    let visible = 0

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      visible = 1
      const target = e.target as Element | null
      want = target?.closest?.(INTERACTIVE) ? 1 : 0
    }
    const onLeave = () => {
      visible = 0
    }
    const onDown = () => {
      press = 0.82
    }
    const onUp = () => {
      press = 1
    }

    addEventListener('mousemove', onMove, { passive: true })
    addEventListener('mouseout', onLeave)
    addEventListener('mousedown', onDown)
    addEventListener('mouseup', onUp)

    let raf = 0
    const tick = () => {
      // Different lags: the ring is close behind, the wash trails well back.
      ringAt.x += (mouse.x - ringAt.x) * 0.22
      ringAt.y += (mouse.y - ringAt.y) * 0.22
      washAt.x += (mouse.x - washAt.x) * 0.07
      washAt.y += (mouse.y - washAt.y) * 0.07
      hot += (want - hot) * 0.16

      const ringSize = (1 + hot * 0.85) * press
      dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0) translate(-50%, -50%) scale(${1 - hot * 0.55})`
      ring.style.transform = `translate3d(${ringAt.x}px, ${ringAt.y}px, 0) translate(-50%, -50%) scale(${ringSize})`
      wash.style.transform = `translate3d(${washAt.x}px, ${washAt.y}px, 0) translate(-50%, -50%) scale(${1 + hot * 0.25})`
      ring.style.borderColor = hot > 0.5 ? 'var(--color-coral)' : 'color-mix(in srgb, var(--color-ink) 35%, transparent)'
      ring.style.opacity = String(visible * (0.5 + hot * 0.5))
      dot.style.opacity = String(visible)
      wash.style.opacity = String(visible * (0.55 + hot * 0.35))

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('mousemove', onMove)
      removeEventListener('mouseout', onLeave)
      removeEventListener('mousedown', onDown)
      removeEventListener('mouseup', onUp)
      document.documentElement.classList.remove('has-pro-cursor')
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] hidden [@media(pointer:fine)]:block" aria-hidden>
      <div ref={washRef} className="pro-cursor-wash" />
      <div ref={ringRef} className="pro-cursor-ring" />
      <div ref={dotRef} className="pro-cursor-dot" />
    </div>
  )
}
