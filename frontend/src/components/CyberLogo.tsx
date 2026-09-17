import { useId } from 'react'

/**
 * "JANIT B" drawn by hand in the style of the Cyberpunk 2077 logo: thin,
 * sharp, slanted strokes, every letter different. The J's tail sweeps left
 * and the B's tail sweeps right, so the name sits between two "wings", and a
 * spaced-out title underneath plays the part of the logo's "2077".
 *
 * No font looks like this, so each letter is a set of polygons on a small
 * grid: cap height runs from y=0 to the baseline at y=100. `advance` is how
 * far the pen moves right after the letter.
 */

type Point = [number, number]
type Glyph = { advance: number; shapes: Point[][] }

const GLYPHS: Record<string, Glyph> = {
  J: {
    advance: 60,
    shapes: [[[14, 0], [64, 0], [60, 82], [47, 100], [-92, 100], [-40, 95], [37, 94], [49, 82], [52, 11], [24, 11]]],
  },
  A: {
    advance: 80,
    shapes: [
      [[0, 100], [42, -8], [52, 4], [80, 100], [68, 100], [46, 24], [13, 100]],
      [[-4, 73], [62, 64], [64, 72], [8, 78]], // crossbar, spiking out to the left
    ],
  },
  N: {
    advance: 76,
    shapes: [
      [[0, 100], [3, 8], [16, 0], [13, 94]],
      [[4, 6], [16, 0], [75, 90], [64, 100]],
      [[64, 2], [78, -8], [75, 90], [64, 76]],
    ],
  },
  I: { advance: 24, shapes: [[[2, 6], [15, 0], [13, 88], [6, 100], [0, 100]]] },
  T: {
    advance: 74,
    shapes: [
      [[-14, 11], [6, 0], [84, 0], [79, 10]], // top bar, pointed at the left
      [[35, 10], [47, 10], [45, 92], [39, 100], [33, 100]],
    ],
  },
  ' ': { advance: 30, shapes: [] },
  B: {
    advance: 70,
    shapes: [
      [[0, 100], [2, 6], [17, -12], [13, 100]], // stem, rising to a point above the cap line
      // upper bowl: an angular reversed C that closes against the stem
      [[13, 0], [52, 0], [62, 9], [60, 33], [49, 43], [13, 43], [13, 33], [45, 33], [50, 28], [51, 14], [46, 10], [13, 10]],
      // lower bowl, wider; its bottom runs on into a long tail sweeping right
      [
        [13, 43], [57, 43], [68, 53], [66, 82], [58, 93], [176, 93], [120, 100], [13, 100],
        [13, 90], [50, 90], [55, 84], [56, 58], [52, 53], [13, 53],
      ],
    ],
  },
}

const GAP = 9
const SLANT = 14 // degrees
const LEFT = -120 // room for the J's tail (it leans further left once slanted)
const RIGHT_PAD = 180 // room for the B's tail
const TOP = -20
const HEIGHT = 170 // letters plus the title underneath

const toPath = (shape: Point[], dx: number) => 'M' + shape.map(([x, y]) => `${x + dx},${y}`).join('L') + 'Z'

export default function CyberLogo({
  text = 'JANIT B',
  subtitle = 'AI · ML · ENGINEER',
  variant = 'base',
  className = '',
}: {
  text?: string
  subtitle?: string
  /** base: gradient fill with split edges. slice: flat currentColor, for the glitch copies. */
  variant?: 'base' | 'slice'
  className?: string
}) {
  const id = useId()
  let x = 0
  let lastStart = 0
  const d: string[] = []
  for (const ch of text.toUpperCase()) {
    const glyph = GLYPHS[ch]
    if (!glyph) continue
    lastStart = x
    d.push(...glyph.shapes.map((s) => toPath(s, x)))
    x += glyph.advance + GAP
  }
  const width = lastStart + RIGHT_PAD - LEFT
  const base = variant === 'base'

  return (
    <svg viewBox={`${LEFT} ${TOP} ${width} ${HEIGHT}`} className={`overflow-visible ${className}`} aria-hidden>
      {base && (
        <defs>
          <linearGradient id={`${id}fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.3" stopColor="#bff9ff" />
            <stop offset="0.55" stopColor="#00f0ff" />
            <stop offset="1" stopColor="#ff2a6d" />
          </linearGradient>
          {/* red and cyan copies nudged left/right, plus a soft glow.
              Done in SVG so it hits the big letters but not the small title. */}
          <filter id={`${id}split`} x="-20%" y="-40%" width="140%" height="180%">
            <feDropShadow dx="-3" dy="0" stdDeviation="0" floodColor="#ff2a6d" floodOpacity="0.85" result="a" />
            <feDropShadow in="a" dx="3" dy="0" stdDeviation="0" floodColor="#00f0ff" floodOpacity="0.6" result="b" />
            <feDropShadow in="b" dx="0" dy="0" stdDeviation="9" floodColor="#00f0ff" floodOpacity="0.55" />
          </filter>
          <filter id={`${id}glow`} x="-10%" y="-100%" width="120%" height="300%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00f0ff" floodOpacity="0.8" />
          </filter>
        </defs>
      )}
      <g
        transform={`skewX(-${SLANT})`}
        fill={base ? `url(#${id}fill)` : 'currentColor'}
        filter={base ? `url(#${id}split)` : undefined}
      >
        <path d={d.join('')} />
      </g>
      {subtitle && (
        <text
          x={lastStart + 160}
          y={136}
          textAnchor="end"
          fontFamily='"Share Tech Mono", monospace'
          fontSize={20}
          letterSpacing={8}
          fill={base ? '#00f0ff' : 'currentColor'}
          filter={base ? `url(#${id}glow)` : undefined}
        >
          {subtitle}
        </text>
      )}
    </svg>
  )
}
