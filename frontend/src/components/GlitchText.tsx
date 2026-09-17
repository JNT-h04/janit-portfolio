import { useEffect, useRef, type ElementType, type ReactNode } from 'react'

type Props = {
  text: string
  as?: ElementType
  className?: string
  /** 1 = normal. Higher means more frequent, stronger bursts. */
  intensity?: number
  /**
   * Draw something other than plain text (e.g. the SVG logo). Called once for
   * the main copy ('base') and once per glitch slice ('slice'). `text` is then
   * only used as the accessible label.
   */
  render?: (variant: 'base' | 'slice') => ReactNode
}

const SLICES = 7
const COLORS = ['#ff2a6d', '#00f0ff', '#fcee0a', '#ffffff']

/**
 * A real "broken signal" glitch, not just a colour flash.
 *
 * On top of the text sit a few copies, each clipped to a thin horizontal band.
 * Most of the time they're hidden. Every few seconds a short burst runs: for
 * about 300 ms the bands jump to random heights, slide sideways and change
 * colour, while the text itself jitters and skews. Hovering triggers a burst too.
 */
export default function GlitchText({ text, as: Tag = 'span', className = '', intensity = 1, render }: Props) {
  const rootRef = useRef<HTMLElement>(null)
  const baseRef = useRef<HTMLSpanElement>(null)
  const sliceRefs = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const base = baseRef.current!
    const slices = sliceRefs.current.filter((s): s is HTMLSpanElement => !!s)
    const timers: number[] = []
    let bursting = false

    const rand = (a: number, b: number) => a + Math.random() * (b - a)

    const frame = (strength: number) => {
      for (const s of slices) {
        const show = Math.random() < 0.75
        const top = rand(0, 90)
        const height = rand(3, 18)
        s.style.opacity = show ? '1' : '0'
        s.style.clipPath = `inset(${top}% 0 ${Math.max(0, 100 - top - height)}% 0)`
        s.style.transform = `translateX(${rand(-14, 14) * strength}px)`
        s.style.color = COLORS[(Math.random() * COLORS.length) | 0]
      }
      base.style.transform = `translate(${rand(-3, 3) * strength}px, ${rand(-1.5, 1.5)}px) skewX(${rand(-6, 6) * strength}deg)`
      base.style.opacity = Math.random() < 0.15 ? '0.4' : '1'
    }

    const reset = () => {
      for (const s of slices) s.style.opacity = '0'
      base.style.transform = ''
      base.style.opacity = '1'
      bursting = false
    }

    const burst = (strength = intensity) => {
      if (bursting) return
      bursting = true
      const frames = 5 + Math.floor(Math.random() * 5)
      for (let i = 0; i < frames; i++) timers.push(window.setTimeout(() => frame(strength), i * 55))
      timers.push(window.setTimeout(reset, frames * 55))
    }

    // Irregular timing is what makes it feel like a real faulty signal.
    const schedule = () => {
      timers.push(
        window.setTimeout(() => {
          burst()
          schedule()
        }, rand(1500, 4500) / intensity),
      )
    }
    schedule()
    timers.push(window.setTimeout(() => burst(1.5), 300)) // one on arrival

    const root = rootRef.current!
    const onEnter = () => burst(1.4)
    root.addEventListener('mouseenter', onEnter)
    return () => {
      timers.forEach(clearTimeout)
      root.removeEventListener('mouseenter', onEnter)
    }
  }, [intensity, text])

  return (
    <Tag ref={rootRef} className={`relative inline-block ${className}`} data-hover aria-label={render ? text : undefined}>
      <span ref={baseRef} className="glitch-base inline-block">
        {render ? render('base') : text}
      </span>
      {Array.from({ length: SLICES }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            sliceRefs.current[i] = el
          }}
          aria-hidden
          className="glitch-slice pointer-events-none absolute inset-0 opacity-0"
        >
          {render ? render('slice') : text}
        </span>
      ))}
    </Tag>
  )
}
