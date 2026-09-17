import { useEffect, useRef } from 'react'

/**
 * The animated neon city behind the whole site, drawn on a <canvas>.
 *
 * Buildings are painted once into off-screen canvases ("layers") whenever the
 * window size changes. Each animation frame then only stacks those finished
 * layers (shifted a little with the mouse for a parallax effect) and draws
 * the moving parts: the grid floor, rain, blinking lights and flickering signs.
 */

export type CityVariant = 'sunset' | 'rain' | 'synth'

type Sign = { x: number; y: number; w: number; h: number; color: string; text: string; phase: number }
type Beacon = { x: number; y: number; phase: number }
type Layer = { canvas: HTMLCanvasElement; depth: number }

const PINK = '#ff2a6d'
const CYAN = '#00f0ff'
const YELLOW = '#fcee0a'
const GLYPHS = ['ネオン', '電脳', 'バー', '夜市', '未来', '拉麺', 'CYBER', 'HOTEL', '24H']

// A seeded random generator, so the skyline looks the same after a resize.
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

export default function CyberCity({ variant = 'sunset' }: { variant?: CityVariant }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const MARGIN = 60 // extra width on each side so parallax never shows an edge

    let W = 0
    let H = 0
    let horizon = 0
    let layers: Layer[] = []
    let sky: HTMLCanvasElement
    let signs: Sign[] = []
    let beacons: Beacon[] = []
    let frame = 0
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
    const drops = Array.from({ length: variant === 'rain' ? 260 : 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.6 + Math.random() * 0.8,
      len: 8 + Math.random() * 18,
    }))
    const stars = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() }))

    const build = () => {
      const dpr = Math.min(devicePixelRatio, 1.5)
      W = innerWidth
      H = innerHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      horizon = Math.round(H * (variant === 'synth' ? 0.58 : 0.64))
      const LW = W + MARGIN * 2
      const rand = rng(variant === 'rain' ? 7 : 42)

      // Sky
      sky = makeCanvas(W, horizon)
      const s = sky.getContext('2d')!
      const g = s.createLinearGradient(0, 0, 0, horizon)
      if (variant === 'rain') {
        g.addColorStop(0, '#02030a')
        g.addColorStop(0.6, '#071a2b')
        g.addColorStop(1, '#0d3b52')
      } else {
        g.addColorStop(0, '#04010d')
        g.addColorStop(0.55, '#1b0736')
        g.addColorStop(0.85, '#5a0f4d')
        g.addColorStop(1, '#ff2a6d')
      }
      s.fillStyle = g
      s.fillRect(0, 0, W, horizon)

      // Sun (sunset and synth only): a striped retro disc
      if (variant !== 'rain') {
        const r = Math.min(W, H) * (variant === 'synth' ? 0.26 : 0.2)
        const cx = W * (variant === 'synth' ? 0.5 : 0.72)
        const cy = horizon - r * 0.35
        s.save()
        s.shadowColor = PINK
        s.shadowBlur = 80
        const sg = s.createLinearGradient(0, cy - r, 0, cy + r)
        sg.addColorStop(0, YELLOW)
        sg.addColorStop(0.5, '#ff7a3d')
        sg.addColorStop(1, PINK)
        s.fillStyle = sg
        s.beginPath()
        s.arc(cx, cy, r, 0, Math.PI * 2)
        s.fill()
        s.restore()
        // cut horizontal gaps that get thicker towards the bottom
        s.globalCompositeOperation = 'destination-out'
        for (let i = 0; i < 9; i++) {
          const y = cy + r * 0.05 + i * r * 0.11
          s.fillRect(cx - r, y, r * 2, 1 + i * 1.3)
        }
        s.globalCompositeOperation = 'source-over'
      }

      // Buildings: far layer (faint), near layer (lit windows, signs, beacons)
      signs = []
      beacons = []
      const skyline = (depth: number, color: string, minH: number, maxH: number, lit: number) => {
        const c = makeCanvas(LW, horizon)
        const b = c.getContext('2d')!
        let x = 0
        while (x < LW) {
          const w = 30 + rand() * 70
          const h = minH + rand() * (maxH - minH)
          const top = horizon - h
          b.fillStyle = color
          b.fillRect(x, top, w, h)
          // stepped roof on some towers
          if (rand() > 0.6) b.fillRect(x + w * 0.25, top - h * 0.08, w * 0.5, h * 0.08)
          // lit windows
          for (let wy = top + 8; wy < horizon - 6; wy += 9) {
            for (let wx = x + 5; wx < x + w - 6; wx += 8) {
              if (rand() < lit) {
                b.fillStyle = rand() < 0.7 ? '#9fe8ff' : rand() < 0.5 ? '#ff8fb3' : '#fff3a0'
                b.globalAlpha = 0.25 + rand() * 0.6
                b.fillRect(wx, wy, 3, 4)
                b.globalAlpha = 1
              }
            }
          }
          if (depth > 0.5) {
            if (rand() > 0.45) beacons.push({ x: x + w / 2, y: top - 4, phase: rand() * 6 })
            if (rand() > 0.55 && h > maxH * 0.45) {
              const vertical = rand() > 0.4
              signs.push({
                x: x + w * 0.2,
                y: top + h * 0.15,
                w: vertical ? 14 : w * 0.6,
                h: vertical ? 60 + rand() * 40 : 14,
                color: [PINK, CYAN, YELLOW][Math.floor(rand() * 3)],
                text: GLYPHS[Math.floor(rand() * GLYPHS.length)],
                phase: rand() * 10,
              })
            }
          }
          x += w + rand() * 6
        }
        return { canvas: c, depth }
      }
      const tall = horizon * 0.75
      layers = [
        skyline(0.25, variant === 'rain' ? '#0a1a2a' : '#1a0a33', tall * 0.2, tall * 0.55, 0.05),
        skyline(0.6, variant === 'rain' ? '#060d17' : '#0c0419', tall * 0.25, tall * 0.9, 0.18),
      ]
      if (variant === 'synth') layers = [layers[0]] // synth: sun and grid, only a low far skyline
    }

    const drawGrid = (t: number) => {
      // The floor: horizontal lines spaced by perspective, moving towards us.
      const floor = ctx.createLinearGradient(0, horizon, 0, H)
      floor.addColorStop(0, variant === 'rain' ? '#062130' : '#2a0833')
      floor.addColorStop(1, '#05060a')
      ctx.fillStyle = floor
      ctx.fillRect(0, horizon, W, H - horizon)

      ctx.strokeStyle = variant === 'rain' ? CYAN : PINK
      ctx.lineWidth = 1
      const offset = reduced ? 0 : (t / 1400) % 1
      for (let i = 0; i < 24; i++) {
        const p = (i + offset) / 24
        const y = horizon + (H - horizon) * p * p
        ctx.globalAlpha = Math.min(1, p * 1.6) * 0.55
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }
      ctx.strokeStyle = CYAN
      const vx = W / 2 + mouse.x * 40
      for (let i = -24; i <= 24; i++) {
        ctx.globalAlpha = 0.35
        ctx.beginPath()
        ctx.moveTo(vx + i * 8, horizon)
        ctx.lineTo(W / 2 + i * (W / 12), H)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      // glow line on the horizon
      ctx.fillStyle = variant === 'rain' ? CYAN : PINK
      ctx.shadowColor = ctx.fillStyle
      ctx.shadowBlur = 16
      ctx.fillRect(0, horizon - 1, W, 2)
      ctx.shadowBlur = 0
    }

    const tick = (t: number) => {
      mouse.x += (mouse.tx - mouse.x) * 0.05
      mouse.y += (mouse.ty - mouse.y) * 0.05
      ctx.clearRect(0, 0, W, H)
      ctx.drawImage(sky, 0, 0)

      // stars twinkle above the skyline
      for (const st of stars) {
        const a = 0.3 + 0.7 * Math.abs(Math.sin(t / 900 + st.s * 20))
        ctx.globalAlpha = reduced ? 0.6 : a * 0.8
        ctx.fillStyle = '#cfe9ff'
        ctx.fillRect(st.x * W, st.y * horizon * 0.6, st.s > 0.9 ? 2 : 1, st.s > 0.9 ? 2 : 1)
      }
      ctx.globalAlpha = 1

      for (const layer of layers) {
        const dx = -MARGIN - mouse.x * MARGIN * layer.depth
        const dy = mouse.y * 6 * layer.depth
        ctx.drawImage(layer.canvas, dx, dy)
        if (layer.depth > 0.5) {
          // blinking red aircraft beacons
          for (const b of beacons) {
            const on = Math.sin(t / 500 + b.phase) > 0.2
            if (!on && !reduced) continue
            ctx.fillStyle = '#ff3b3b'
            ctx.shadowColor = '#ff3b3b'
            ctx.shadowBlur = 8
            ctx.fillRect(b.x + dx - 1, b.y + dy, 2, 2)
          }
          // neon signs, flickering now and then like a failing tube
          ctx.font = '11px "Share Tech Mono", monospace'
          ctx.textAlign = 'center'
          for (const s of signs) {
            const flicker = Math.sin(t / 60 + s.phase) > 0.93 || Math.sin(t / 1700 + s.phase) > 0.97
            ctx.globalAlpha = flicker && !reduced ? 0.25 : 1
            ctx.strokeStyle = s.color
            ctx.shadowColor = s.color
            ctx.shadowBlur = 14
            ctx.lineWidth = 1.5
            ctx.strokeRect(s.x + dx, s.y + dy, s.w, s.h)
            ctx.fillStyle = s.color
            if (s.h > s.w) {
              ;[...s.text].slice(0, 4).forEach((ch, i) => ctx.fillText(ch, s.x + dx + s.w / 2, s.y + dy + 16 + i * 14))
            } else {
              ctx.fillText(s.text, s.x + dx + s.w / 2, s.y + dy + 11)
            }
          }
          ctx.globalAlpha = 1
          ctx.shadowBlur = 0
        }
      }

      // mist where the city meets the ground
      const mist = ctx.createLinearGradient(0, horizon - 80, 0, horizon + 10)
      mist.addColorStop(0, 'rgba(255,42,109,0)')
      mist.addColorStop(1, variant === 'rain' ? 'rgba(0,240,255,0.18)' : 'rgba(255,42,109,0.25)')
      ctx.fillStyle = mist
      ctx.fillRect(0, horizon - 80, W, 90)

      drawGrid(t)

      // rain
      if (!reduced) {
        ctx.strokeStyle = variant === 'rain' ? 'rgba(160,220,255,0.35)' : 'rgba(0,240,255,0.18)'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (const d of drops) {
          d.y += d.speed * 0.012
          if (d.y > 1) {
            d.y = -0.05
            d.x = Math.random()
          }
          const x = d.x * W
          const y = d.y * H
          ctx.moveTo(x, y)
          ctx.lineTo(x - 2, y + d.len)
        }
        ctx.stroke()
      }

      if (!reduced) frame = requestAnimationFrame(tick)
    }

    const onMove = (e: MouseEvent) => {
      mouse.tx = e.clientX / innerWidth - 0.5
      mouse.ty = e.clientY / innerHeight - 0.5
    }
    const onResize = () => {
      build()
      if (reduced) tick(0)
    }

    build()
    frame = requestAnimationFrame(tick)
    addEventListener('resize', onResize)
    addEventListener('mousemove', onMove)
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('resize', onResize)
      removeEventListener('mousemove', onMove)
    }
  }, [variant])

  return <canvas ref={ref} className="fixed inset-0 -z-10 h-full w-full" aria-hidden />
}
