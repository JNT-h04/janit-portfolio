import { useEffect, useRef } from 'react'

type Props = {
  /** ms until the screen is fully covered — the moment the route swaps. */
  coverMs: number
  /** ms until the overlay is gone. */
  totalMs: number
  /**
   * What the warp is playing over at the start: the cream professional page,
   * or something dark (the gate, or the casual side you are leaving). A streak
   * has to be darker than paper and brighter than night, so it cannot be one
   * fixed colour.
   */
  over?: 'light' | 'dark'
}

/**
 * Each streak carries two versions of its colour: a deep one that reads on the
 * cream page (the site's own #FF6B5A and #FFB347 are lighter than the paper and
 * simply vanish on it) and a bright one that reads on black. Which is used is
 * mixed frame by frame as the cream veil rises, so a jump that starts on the
 * dark side stays visible the whole way across.
 */
const STREAK_COLOURS: { deep: readonly [number, number, number]; hot: readonly [number, number, number] }[] = [
  { deep: [226, 74, 58], hot: [255, 138, 120] }, // coral
  { deep: [226, 74, 58], hot: [255, 138, 120] },
  { deep: [214, 126, 24], hot: [255, 198, 110] }, // amber
  { deep: [92, 62, 220], hot: [173, 154, 255] }, // violet
  { deep: [92, 62, 220], hot: [173, 154, 255] },
  { deep: [27, 23, 38], hot: [255, 255, 255] }, // ink on paper, white on night
]

type Star = { x: number; y: number; z: number; pz: number; c: (typeof STREAK_COLOURS)[number] }

/** Linear blend between two colours; `m` of 1 is all of `b`. */
function mix(a: readonly [number, number, number], b: readonly [number, number, number], m: number) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * m),
    Math.round(a[1] + (b[1] - a[1]) * m),
    Math.round(a[2] + (b[2] - a[2]) * m),
  ] as const
}

/**
 * A light-speed jump between pages: the starfield accelerates until it tears
 * into streaks, the page whites out at the peak (which is where the route
 * quietly changes underneath), then the streaks brake back into points.
 *
 * Everything is one canvas — a few hundred projected points with their own
 * previous position, drawn as a line from where they were to where they are,
 * which is what makes the trail lengthen with speed instead of being faked.
 */
export default function Lightspeed({ coverMs, totalMs, over = 'light' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(devicePixelRatio || 1, 2)
    let w = 0
    let h = 0
    const resize = () => {
      w = innerWidth
      h = innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    addEventListener('resize', resize)

    // Points live in a box around the camera; z is depth, 1 = far, 0 = past you.
    const COUNT = Math.round(Math.min(520, Math.max(220, (w * h) / 2600)))
    const spawn = (z?: number): Star => ({
      x: (Math.random() * 2 - 1) * 1.3,
      y: (Math.random() * 2 - 1) * 1.3,
      z: z ?? Math.random() * 0.9 + 0.1,
      pz: 0,
      c: STREAK_COLOURS[(Math.random() * STREAK_COLOURS.length) | 0],
    })
    const stars: Star[] = Array.from({ length: COUNT }, () => spawn())
    for (const s of stars) s.pz = s.z

    const cover = coverMs / totalMs
    // Speed ramps hard into the cover, then brakes — the shape of the whole move.
    const speedAt = (t: number) => {
      // Never starts from a standstill: the field is already moving on the
      // first frame, so the jump reads as acceleration rather than a fade.
      if (t < cover) return 0.6 + 3.1 * Math.pow(t / cover, 2.2)
      const u = (t - cover) / (1 - cover)
      return 0.05 + 3.2 * Math.pow(1 - u, 2.2)
    }
    // Opaque at the peak so the swap underneath is never seen.
    const veilAt = (t: number) => {
      // Late and steep: the page you are leaving stays readable behind the
      // streaks until the last moment, then the flash takes it.
      if (t < cover) return Math.min(1, Math.pow(t / cover, 2.2) * 1.2)
      const u = (t - cover) / (1 - cover)
      return Math.pow(1 - u, 1.4)
    }

    // The clock starts on the first frame, not here: rAF hands the callback
    // the timestamp of the frame it belongs to, which can be EARLIER than a
    // performance.now() taken while scheduling it. That made `t` negative for
    // one frame, and Math.pow(negative, 2.2) is NaN — which fed into every
    // star's depth and stayed there, because NaN never satisfies the respawn
    // test either. The whole field silently stopped being drawn.
    let start = 0
    let raf = 0
    const frame = (now: number) => {
      if (!start) start = now
      const t = Math.min(1, Math.max(0, (now - start) / totalMs))
      const speed = speedAt(t)
      const veil = veilAt(t)

      // The canvas is cleared every frame and the cream is painted at the
      // veil's own alpha, so the streaks stay at full strength over a page
      // that is still readable. (Fading the whole layer instead would fade
      // the streaks with it, which is what makes cheap warps look like a
      // white fade with specks in it.)
      ctx.clearRect(0, 0, w, h)
      if (veil > 0.003) {
        ctx.fillStyle = `rgba(255, 249, 243, ${veil})`
        ctx.fillRect(0, 0, w, h)
      }

      const cx = w / 2
      const cy = h / 2
      const focal = Math.max(w, h) * 0.55
      // Streaks bow out as the jump ends, so the field settles into points.
      const fade = t < cover ? 1 : Math.pow(1 - (t - cover) / (1 - cover), 0.9)

      ctx.lineCap = 'round'
      for (const s of stars) {
        s.z -= speed * 0.016
        if (s.z <= 0.02) {
          const fresh = spawn(1)
          s.x = fresh.x
          s.y = fresh.y
          s.z = 1
          s.pz = 1
          s.c = fresh.c
          continue
        }
        // The trail is where this point was a few frames ago: length follows
        // speed, which is the whole illusion.
        s.pz = Math.min(1.8, s.z + speed * 0.016 * 3.4)

        const x = cx + (s.x * focal) / s.z
        const y = cy + (s.y * focal) / s.z
        const px = cx + (s.x * focal) / s.pz
        const py = cy + (s.y * focal) / s.pz
        if (x < -300 || x > w + 300 || y < -300 || y > h + 300) continue

        const near = 1 - s.z // 0 far, 1 right on top of you
        // On a light page the deep colour is right from the first frame; on a
        // dark one the streak starts bright and deepens as the cream arrives.
        const [r, g, b] = mix(s.c.hot, s.c.deep, over === 'light' ? 1 : veil)
        const alpha = Math.min(1, (0.45 + 0.55 * near) * fade)
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        ctx.lineWidth = 1.3 + near * 4.6
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(x, y)
        ctx.stroke()

        // A soft wide pass under the closest streaks, for bloom.
        if (near > 0.55) {
          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.12 * fade})`
          ctx.lineWidth = 8 + near * 12
          ctx.stroke()
        }
      }

      // The jump flash: a hot core that blooms as the speed peaks.
      const bloom = Math.pow(Math.max(0, 1 - Math.abs(t - cover) / (cover * 0.85)), 2)
      if (bloom > 0.002) {
        const rad = Math.max(w, h) * (0.12 + bloom * 0.9)
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
        grd.addColorStop(0, `rgba(255, 255, 255, ${0.95 * bloom})`)
        grd.addColorStop(0.35, `rgba(255, 222, 190, ${0.6 * bloom})`)
        grd.addColorStop(0.7, `rgba(255, 179, 71, ${0.22 * bloom})`)
        grd.addColorStop(1, 'rgba(255, 249, 243, 0)')
        ctx.fillStyle = grd
        ctx.fillRect(0, 0, w, h)
      }

      if (t < 1) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', resize)
    }
  }, [coverMs, totalMs, over])

  return (
    <div
      // No background of its own: the cream is painted inside the canvas at
      // the veil's alpha. It does swallow clicks while it plays, so a second
      // jump can't start mid-jump.
      className="fixed inset-0 z-[55]"
      aria-hidden
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="lightspeed-rings pointer-events-none absolute inset-0" />
    </div>
  )
}
