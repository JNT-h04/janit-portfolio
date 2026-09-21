import { useEffect, useRef } from 'react'

/**
 * A photograph rebuilt out of 1s and 0s on a phosphor screen, in the spirit of
 * Arnim Zola's monitor face: vertical scan lines, a green CRT, and the picture
 * tearing every few seconds before it settles again.
 *
 * How it works:
 *  1. The photo is drawn once into a tiny offscreen canvas — one pixel per
 *     character cell — and read back, which gives the brightness of each cell.
 *  2. Those brightnesses are turned into a grid of 1s and 0s and drawn once
 *     into a second offscreen canvas. Redrawing thousands of characters every
 *     frame would be far too slow, so that canvas is the thing that gets
 *     animated, not the text.
 *  3. Each frame copies that canvas across in horizontal bands. Offsetting a
 *     few bands sideways is what produces the tearing.
 */
export default function BinaryPortrait({
  src,
  className = '',
  cell = 4,
  crop = { x: 0.12, y: 0.0, w: 0.76, h: 0.68 },
}: {
  src: string
  className?: string
  /** size of one character cell in CSS pixels; smaller = more detail, more work */
  cell?: number
  /** which part of the photo to use, as fractions — defaults to head and shoulders */
  crop?: { x: number; y: number; w: number; h: number }
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let stopped = false
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

    const image = new Image()
    image.src = src
    image.onload = () => {
      if (stopped) return

      const dpr = Math.min(devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const srcW = image.width * crop.w
      const srcH = image.height * crop.h
      const h = Math.round((w * srcH) / srcW)
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.height = `${h}px`
      ctx.scale(dpr, dpr)

      const cols = Math.floor(w / cell)
      const rows = Math.floor(h / cell)

      // --- step 1: one pixel per cell, then read the brightness back
      const tiny = document.createElement('canvas')
      tiny.width = cols
      tiny.height = rows
      const tctx = tiny.getContext('2d', { willReadFrequently: true })!
      tctx.drawImage(
        image,
        image.width * crop.x,
        image.height * crop.y,
        srcW,
        srcH,
        0,
        0,
        cols,
        rows,
      )
      const pixels = tctx.getImageData(0, 0, cols, rows).data

      // The photo is a subject on a white studio background. Inverting the whole
      // thing would light up his hair and darken his face, which loses the
      // likeness completely. So the near-white background is switched off and
      // everything else keeps its real brightness: the lit side of the face
      // glows, the hair stays a dim mass that still shows its shape.
      const luma = new Float32Array(cols * rows)
      const subject: number[] = []
      for (let i = 0; i < cols * rows; i++) {
        const v =
          (0.299 * pixels[i * 4] + 0.587 * pixels[i * 4 + 1] + 0.114 * pixels[i * 4 + 2]) / 255
        luma[i] = v
        if (v <= 0.86) subject.push(v)
      }

      // Stretch the subject's own range across the full screen. Without this the
      // picture sits in a narrow band of mid greens and reads as a smudge; this
      // is what makes the face actually glow against the hair.
      subject.sort((a, b) => a - b)
      const lo = subject[Math.floor(subject.length * 0.04)] ?? 0
      const hi = subject[Math.floor(subject.length * 0.985)] ?? 1
      const span = Math.max(0.001, hi - lo)

      // Unsharp mask: subtract a blurred copy of the image from itself, which
      // exaggerates edges. Downsampling to one pixel per character averages a
      // lot of detail away, and this is what puts the eyes, nose and jawline
      // back in rather than leaving a soft green smudge.
      const blurred = new Float32Array(cols * rows)
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          let sum = 0
          let n = 0
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx
              const ny = y + dy
              if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
              sum += luma[ny * cols + nx]
              n++
            }
          }
          blurred[y * cols + x] = sum / n
        }
      }

      const light = new Float32Array(cols * rows)
      for (let i = 0; i < cols * rows; i++) {
        if (luma[i] > 0.86) continue // background stays off
        const sharp = luma[i] + 0.85 * (luma[i] - blurred[i])
        const n = Math.min(1, Math.max(0, (sharp - lo) / span))
        light[i] = 0.1 + 0.9 * Math.pow(n, 0.7)
      }

      // --- step 2: draw the characters once
      const glyphs = document.createElement('canvas')
      glyphs.width = canvas.width
      glyphs.height = canvas.height
      const gctx = glyphs.getContext('2d')!
      gctx.scale(dpr, dpr)
      gctx.font = `${cell}px "Share Tech Mono", ui-monospace, monospace`
      gctx.textBaseline = 'top'

      const bits = new Uint8Array(cols * rows)
      const paintCell = (cx: number, cy: number) => {
        const i = cy * cols + cx
        const v = light[i]
        gctx.clearRect(cx * cell, cy * cell, cell, cell)
        if (v <= 0) return // background: leave the screen dark
        // '0' covers more of its cell than '1' does, so letting brightness
        // bias the choice makes the lit areas read as genuinely denser.
        bits[i] = Math.random() < 0.15 + v * 0.7 ? 0 : 1
        // brighter parts of the face are a stronger green; the darkest parts
        // stay as faint ghosts, which is what gives the image its shape
        const a = 0.26 + v * 0.74
        // Only the real highlights go near white; everything else stays firmly
        // phosphor green, or the face washes out to grey and stops looking
        // like a monitor.
        gctx.fillStyle =
          v > 0.88
            ? `rgba(206,255,220,${a})`
            : v > 0.62
              ? `rgba(96,255,158,${a})`
              : v > 0.36
                ? `rgba(46,214,118,${a})`
                : `rgba(24,130,72,${a})`
        gctx.fillText(String(bits[i]), cx * cell, cy * cell)
      }
      for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) paintCell(cx, cy)

      // --- step 3: animate
      let frame = 0
      let tearUntil = 0
      let nextTear = performance.now() + 1200 + Math.random() * 2600

      const draw = (now: number) => {
        if (stopped) return
        frame++

        // a handful of digits flip every frame, so the image is never static
        if (!reduced) {
          for (let n = 0; n < 26; n++) {
            const cx = (Math.random() * cols) | 0
            const cy = (Math.random() * rows) | 0
            if (light[cy * cols + cx] > 0) paintCell(cx, cy)
          }
        }

        if (!reduced && now > nextTear) {
          tearUntil = now + 90 + Math.random() * 180
          nextTear = now + 1200 + Math.random() * 3000
        }
        const tearing = now < tearUntil

        ctx.clearRect(0, 0, w, h)

        // the screen itself
        ctx.fillStyle = '#02100a'
        ctx.fillRect(0, 0, w, h)

        // mains flicker
        ctx.globalAlpha = reduced ? 1 : 0.88 + Math.sin(frame * 0.3) * 0.05 + Math.random() * 0.06

        // copy the glyph sheet across in bands; shift some of them when tearing
        const band = 14
        for (let y = 0; y < h; y += band) {
          let dx = 0
          if (tearing && Math.random() > 0.55) dx = (Math.random() - 0.5) * 26
          else if (!reduced && Math.random() > 0.995) dx = (Math.random() - 0.5) * 8
          ctx.drawImage(glyphs, 0, y * dpr, glyphs.width, band * dpr, dx, y, w, band)
        }

        // bloom: a blurred copy underneath, which is what makes phosphor glow.
        // Kept gentle — too much of it and the glow swallows the face.
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = tearing ? 0.34 : 0.18
        ctx.filter = 'blur(2px)'
        ctx.drawImage(glyphs, 0, 0, w, h)
        ctx.filter = 'none'
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1

        // chromatic split, stronger during a tear
        if (!reduced) {
          ctx.globalCompositeOperation = 'lighter'
          ctx.globalAlpha = tearing ? 0.34 : 0.07
          ctx.drawImage(glyphs, tearing ? -3 : -1, 0, w, h)
          ctx.globalCompositeOperation = 'source-over'
        }

        ctx.globalAlpha = 1

        // Vertical scan lines: the signature of the Zola screen. The spacing
        // follows the character size — fixed 3px lines would sit on top of
        // every glyph at this resolution and erase the picture.
        const gap = Math.max(3, cell)
        ctx.fillStyle = 'rgba(0,0,0,0.3)'
        for (let x = 0; x < w; x += gap) ctx.fillRect(x, 0, 1, h)
        // and the horizontal ones a CRT adds
        ctx.fillStyle = 'rgba(0,0,0,0.14)'
        for (let y = 0; y < h; y += gap) ctx.fillRect(0, y, w, 1)

        // a bright line rolling slowly down the tube
        if (!reduced) {
          const roll = (now / 26) % (h + 120)
          const grad = ctx.createLinearGradient(0, roll - 60, 0, roll + 60)
          grad.addColorStop(0, 'rgba(57,255,136,0)')
          grad.addColorStop(0.5, 'rgba(57,255,136,0.10)')
          grad.addColorStop(1, 'rgba(57,255,136,0)')
          ctx.fillStyle = grad
          ctx.fillRect(0, roll - 60, w, 120)
        }

        raf = requestAnimationFrame(draw)
      }
      raf = requestAnimationFrame(draw)
    }

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
    }
  }, [src, cell, crop.x, crop.y, crop.w, crop.h])

  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label="Portrait of Janit B, rendered as ones and zeroes on a monitor"
    />
  )
}
