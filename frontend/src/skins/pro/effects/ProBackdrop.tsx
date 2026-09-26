import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * The professional side's answer to the cyberpunk city.
 *
 * Same idea — a skyline that belongs to the page — but drawn as thin ink lines
 * on paper instead of neon, with slow-moving pools of colour behind it. It is
 * pure decoration: it sits behind everything, ignores the pointer, and stops
 * moving for anyone who has asked for reduced motion.
 */
export default function ProBackdrop() {
  const far = useRef<HTMLDivElement>(null)
  const near = useRef<HTMLDivElement>(null)
  const city = useRef<HTMLDivElement>(null)
  // The skyline is the home hero's. On a project page it sat behind the demo
  // controls, which on a phone is right where you are reading and tapping.
  const onHome = useLocation().pathname === '/'

  // Parallax: the far skyline drifts down slowly, the near one faster, so the
  // hero feels like it has depth without anything moving on its own. The city
  // belongs to the hero, so it also fades out over the first screenful —
  // otherwise buildings sit behind the text for the whole page.
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      if (far.current) far.current.style.transform = `translate3d(0, ${y * 0.06}px, 0)`
      if (near.current) near.current.style.transform = `translate3d(0, ${y * 0.14}px, 0)`
      if (city.current) {
        // Gone within half a screen of scrolling: at 0.75 the buildings were
        // still at ~40% behind the first cards, which read as the backdrop
        // following the content down the page instead of belonging to the hero.
        const faded = Math.min(1, y / (innerHeight * 0.5))
        city.current.style.opacity = String(1 - faded)
      }
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    addEventListener('scroll', onScroll, { passive: true })
    return () => {
      removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="pro-aurora pro-aurora-a" />
      <div className="pro-aurora pro-aurora-b" />
      <div className="pro-aurora pro-aurora-c" />
      <div className="pro-aurora pro-aurora-d" />
      <div className="pro-grid" />

      <div ref={city} className={`absolute inset-0 will-change-[opacity] ${onHome ? '' : 'hidden'}`}>
        <div ref={far} className="absolute inset-x-0 bottom-0 will-change-transform">
          <Skyline layer="far" />
        </div>
        <div ref={near} className="absolute inset-x-0 bottom-0 will-change-transform">
          <Skyline layer="near" />
        </div>
        {/* the ground the city stands on, so the buildings rise out of paper */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-paper to-transparent" />
      </div>

      <div className="pro-sweep" />
      <div className="pro-grain" />
    </div>
  )
}

/**
 * One band of city. The buildings are generated from a fixed seed rather than
 * hand-drawn, so the skyline is detailed but the file stays short — and it is
 * deterministic, so it never flickers into a different city on a re-render.
 */
function Skyline({ layer }: { layer: 'far' | 'near' }) {
  const far = layer === 'far'
  const W = 1600
  const H = far ? 200 : 150
  const { outlines, windows } = makeCity(far ? 34 : 77, W, H)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`pro-skyline block h-[20vh] w-full sm:h-[22vh] ${far ? 'opacity-[0.3]' : 'opacity-[0.5]'}`}
    >
      <defs>
        {/* the glow around a lit window */}
        <filter id={`lit-${layer}`} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation={far ? 1.4 : 2} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* the lit windows sit behind the outlines, so the ink stays crisp */}
      <g filter={`url(#lit-${layer})`}>
        {windows.map((w, i) => (
          <rect
            key={i}
            x={w.x}
            y={w.y}
            width={w.w}
            height={w.h}
            fill={w.warm ? 'var(--color-amber)' : 'var(--color-coral)'}
            className={w.blink ? 'pro-window-blink' : 'pro-window'}
            style={{ animationDelay: `${1.6 + (i % 23) * 0.09}s` }}
          />
        ))}
      </g>

      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={far ? 1 : 1.25}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{ color: 'var(--color-ink)' }}
      >
        {outlines.map((d, i) => (
          <path
            key={i}
            d={d}
            style={{ ['--len' as string]: 2600, animationDelay: `${(far ? 0 : 0.35) + i * 0.035}s` }}
          />
        ))}
        {/* Two landmarks, so the skyline reads as a place and not just bars. */}
        {far ? <Tower x={1180} baseY={H} /> : <Spire x={330} baseY={H} />}
      </g>
    </svg>
  )
}

/** A lattice tower, in the spirit of Tokyo Tower. */
function Tower({ x, baseY }: { x: number; baseY: number }) {
  const h = 150
  const halfBase = 30
  const halfTop = 7
  const topY = baseY - h
  return (
    <>
      <path
        d={`M ${x - halfBase} ${baseY} L ${x - halfTop} ${topY} L ${x + halfTop} ${topY} L ${x + halfBase} ${baseY}`}
        style={{ ['--len' as string]: 400, animationDelay: '0.5s' }}
      />
      <line x1={x} y1={topY} x2={x} y2={topY - 26} style={{ ['--len' as string]: 30, animationDelay: '1.4s' }} />
      {[0.3, 0.58].map((t, i) => {
        const y = baseY - h * t
        const half = halfBase + (halfTop - halfBase) * t
        return (
          <line
            key={i}
            x1={x - half}
            y1={y}
            x2={x + half}
            y2={y}
            style={{ ['--len' as string]: 70, animationDelay: `${0.9 + i * 0.15}s` }}
          />
        )
      })}
    </>
  )
}

/** A tapering broadcast spire, in the spirit of Skytree. */
function Spire({ x, baseY }: { x: number; baseY: number }) {
  const topY = baseY - 138
  return (
    <>
      <path
        d={`M ${x - 15} ${baseY} Q ${x - 7} ${baseY - 80} ${x - 4} ${topY} L ${x + 4} ${topY} Q ${x + 7} ${baseY - 80} ${x + 15} ${baseY}`}
        style={{ ['--len' as string]: 330, animationDelay: '0.75s' }}
      />
      <line x1={x} y1={topY} x2={x} y2={topY - 30} style={{ ['--len' as string]: 34, animationDelay: '1.5s' }} />
      <path
        d={`M ${x - 11} ${baseY - 62} L ${x + 11} ${baseY - 62}`}
        style={{ ['--len' as string]: 24, animationDelay: '1.2s' }}
      />
    </>
  )
}

/**
 * A tiny deterministic random number generator. Math.random() would redraw a
 * different city on every render; this always draws the same one.
 */
function rng(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

type Win = { x: number; y: number; w: number; h: number; warm: boolean; blink: boolean }

/** Blocks of flats and offices, with warm windows lit in some of them. */
function makeCity(seed: number, width: number, height: number) {
  const next = rng(seed)
  const outlines: string[] = []
  const windows: Win[] = []
  let x = -30

  while (x < width) {
    const w = 46 + next() * 96
    const h = 34 + next() * (height - 55)
    const top = height - h
    let d = `M ${x} ${height} L ${x} ${top} L ${x + w} ${top} L ${x + w} ${height}`

    const roof = next()
    if (roof > 0.78) {
      // a setback: a smaller box sitting on the roof
      const sw = w * 0.42
      const sx = x + w * 0.3
      d += ` M ${sx} ${top} L ${sx} ${top - 16} L ${sx + sw} ${top - 16} L ${sx + sw} ${top}`
    } else if (roof > 0.6) {
      // an aerial
      const ax = x + w / 2
      d += ` M ${ax} ${top} L ${ax} ${top - 22}`
    }

    // windows on a grid, only some of them switched on
    const cols = Math.max(1, Math.floor((w - 16) / 15))
    const rows = Math.max(1, Math.floor((h - 18) / 20))
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (next() > 0.55) continue
        windows.push({
          x: x + 9 + c * 15,
          y: top + 11 + r * 20,
          w: 6,
          h: 8,
          warm: next() > 0.28,
          blink: next() > 0.93,
        })
      }
    }

    outlines.push(d)
    x += w + 6 + next() * 20
  }
  return { outlines, windows }
}
