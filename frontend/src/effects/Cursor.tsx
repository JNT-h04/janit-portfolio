import { useEffect, useRef } from 'react'

type Spark = { x: number; y: number; vx: number; vy: number; life: number; hue: string }

const COLORS = ['#00f0ff', '#ff2a6d', '#d1f700']

/**
 * Targeting-reticle cursor plus a spark trail drawn on a full-screen canvas.
 *
 * How it works: mouse events only *record* the position. A single
 * requestAnimationFrame loop does all the drawing about 60 times a second,
 * so fast mouse movement never floods React with re-renders. React doesn't
 * render anything here; we move DOM nodes and paint the canvas directly
 * through refs.
 */
export default function Cursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Touch screens have no hover, so keep their native behaviour.
    if (!window.matchMedia('(pointer: fine)').matches) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.documentElement.classList.add('has-cursor')

    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const dot = dotRef.current!
    const ring = ringRef.current!
    const root = ring.parentElement!

    const mouse = { x: innerWidth / 2, y: innerHeight / 2 }
    const ringPos = { ...mouse }
    const sparks: Spark[] = []
    let hovering = false
    let frame = 0

    const resize = () => {
      canvas.width = innerWidth * devicePixelRatio
      canvas.height = innerHeight * devicePixelRatio
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    }

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      root.style.opacity = '1' // stay hidden until the mouse has actually moved
      // Anything clickable (or marked data-hover) makes the reticle lock on.
      hovering = !!(e.target as Element).closest('a, button, input, textarea, [data-hover]')
      if (reduced) return
      for (let i = 0; i < 2; i++) {
        sparks.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 1.6,
          vy: (Math.random() - 0.5) * 1.6,
          life: 1,
          hue: COLORS[(Math.random() * COLORS.length) | 0],
        })
      }
    }

    const onDown = () => {
      dot.animate([{ scale: '1' }, { scale: '3' }, { scale: '1' }], { duration: 250 })
      if (reduced) return
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2
        sparks.push({ x: mouse.x, y: mouse.y, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, life: 1, hue: '#ff2a6d' })
      }
    }

    const tick = () => {
      // The ring trails behind the dot: each frame it covers 18% of the gap.
      ringPos.x += (mouse.x - ringPos.x) * 0.18
      ringPos.y += (mouse.y - ringPos.y) * 0.18
      dot.style.translate = `${mouse.x}px ${mouse.y}px`
      // translate changes every frame; rotate/scale/colour change rarely and are
      // animated by the CSS transition on the element.
      ring.style.translate = `${ringPos.x}px ${ringPos.y}px`
      ring.style.rotate = hovering ? '45deg' : '0deg'
      ring.style.scale = hovering ? '1.6' : '1'
      ring.style.color = hovering ? '#ff2a6d' : '#00f0ff'

      ctx.clearRect(0, 0, innerWidth, innerHeight)
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.x += s.vx
        s.y += s.vy
        s.life -= 0.03
        if (s.life <= 0) {
          sparks.splice(i, 1)
          continue
        }
        ctx.globalAlpha = s.life
        ctx.fillStyle = s.hue
        ctx.fillRect(s.x, s.y, 2, 2)
      }
      frame = requestAnimationFrame(tick)
    }

    resize()
    addEventListener('resize', resize)
    addEventListener('mousemove', onMove)
    addEventListener('mousedown', onDown)
    frame = requestAnimationFrame(tick)

    // Cleanup runs when the component unmounts; without it, listeners leak.
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('resize', resize)
      removeEventListener('mousemove', onMove)
      removeEventListener('mousedown', onDown)
      document.documentElement.classList.remove('has-cursor')
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] hidden opacity-0 [@media(pointer:fine)]:block">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div ref={ringRef} className="absolute -top-4 -left-4 h-8 w-8 border-2 border-current transition-[scale,rotate,color] duration-200">
        <span className="absolute -top-2 left-1/2 h-2 w-px bg-current" />
        <span className="absolute -bottom-2 left-1/2 h-2 w-px bg-current" />
      </div>
      <div ref={dotRef} className="absolute -top-[3px] -left-[3px] h-1.5 w-1.5 bg-hot shadow-[0_0_8px_#ff2a6d]" />
    </div>
  )
}
