import { useEffect, type RefObject } from 'react'

/**
 * Small random glitches while the terminal sits open, so the window feels like
 * a live screen rather than a static box.
 *
 * Every few seconds it plays a burst of 2-4 frames, about 45 ms each: the
 * window jumps sideways, a horizontal slice is cut out of it, the colours
 * shift, and sometimes it dims for a frame. Then everything resets.
 *
 * The timing is deliberately uneven. A glitch on a fixed beat reads as an
 * animation; an irregular one reads as interference.
 */
export function useMicroGlitch(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const el = ref.current
    if (!el || !active) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const timers: number[] = []
    const rand = (a: number, b: number) => a + Math.random() * (b - a)

    const reset = () => {
      el.style.transform = ''
      el.style.clipPath = ''
      el.style.filter = ''
      el.style.opacity = ''
    }

    const frame = () => {
      const top = rand(0, 85)
      const height = rand(2, 14)
      // Cutting a slice out and shifting the window is what makes it look torn.
      el.style.clipPath = `polygon(0 0, 100% 0, 100% ${top}%, 0 ${top}%, 0 ${top}%, 100% ${top}%,
        100% ${top + height}%, 0 ${top + height}%, 0 100%, 100% 100%, 100% 100%, 0 100%)`
      el.style.transform = `translateX(${rand(-6, 6)}px) skewX(${rand(-1.5, 1.5)}deg)`
      el.style.filter = Math.random() < 0.4 ? `hue-rotate(${rand(-60, 60)}deg) contrast(1.4)` : 'brightness(1.25)'
      if (Math.random() < 0.25) el.style.opacity = '0.75'
    }

    const burst = () => {
      const frames = 2 + Math.floor(Math.random() * 3)
      for (let i = 0; i < frames; i++) timers.push(window.setTimeout(frame, i * 45))
      timers.push(window.setTimeout(reset, frames * 45))
      schedule()
    }

    const schedule = () => {
      timers.push(window.setTimeout(burst, rand(2500, 7000)))
    }

    schedule()
    return () => {
      timers.forEach(clearTimeout)
      reset()
    }
  }, [ref, active])
}
